import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import BackArrow from '../components/BackArrow';
// import BottomNav from '../components/BottomNav';
import { useRouter } from 'expo-router';
import { getAuth } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import { firestore } from '../firebaseConfig';
import { FontAwesome } from '@expo/vector-icons';

const MyRecordScreen = () => {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const [profile, setProfile] = useState({ firstName: '', lastName: '', age: null, phoneNumber: '', email: '', isVerified: false });
  const [poemScores, setPoemScores] = useState([]);
  const [latestSurvey, setLatestSurvey] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = getAuth().currentUser;

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        await fetchUserProfile();
        await fetchPoemScores();
        await fetchLatestSurvey();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const fetchUserProfile = async () => {
    const userDocRef = doc(firestore, "users", user.email);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      setProfile({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        age: data.dateOfBirth ? calculateAge(data.dateOfBirth) : null,
        phoneNumber: data.mobileNumber || 'N/A',
        email: data.email || user.email,
        isVerified: data.isVerified || false
      });
    }
  };

  const calculateAge = (dateOfBirth) => {
    const dob = new Date(dateOfBirth.seconds * 1000);
    const ageDiffMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const fetchPoemScores = async () => {
    const scoresRef = collection(firestore, "users", user.email, "POEMScores");
    const scoresQuery = query(scoresRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(scoresQuery);
  
    const scoresData = querySnapshot.docs
      .map(doc => {
        const score = doc.data().totalScore;
        return {
          date: doc.data().timestamp?.toDate()?.toLocaleDateString() || "N/A",
          score: !isNaN(score) ? score : 0,
        };
      })
      .filter(item => item.score !== undefined && item.score !== null);
  
    setPoemScores(scoresData.reverse());
  };

  const fetchLatestSurvey = async () => {
    const surveyRef = collection(firestore, "users", user.email, "POEMScores");
    const surveyQuery = query(surveyRef, orderBy("timestamp", "desc"), limit(1));
    const querySnapshot = await getDocs(surveyQuery);

    if (!querySnapshot.empty) {
      const latestSurveyData = querySnapshot.docs[0].data();
      setLatestSurvey({
        score: latestSurveyData.totalScore,
        severity: getSeverityLevel(latestSurveyData.totalScore),
      });
    }
  };

  const getSeverityLevel = (score) => {
    switch (true) {
      case score <= 2:
        return { level: "Clear", message: "Your skin is clear, with minimal eczema symptoms." };
      case score >= 3 && score <= 7:
        return { level: "Mild", message: "Mild eczema symptoms detected. Keep monitoring your skin condition." };
      case score >= 8 && score <= 16:
        return { level: "Moderate", message: "Moderate eczema symptoms are present. Consider consulting a healthcare provider." };
      case score >= 17 && score <= 24:
        return { level: "Severe", message: "Severe eczema symptoms detected. It’s recommended to seek medical advice." };
      case score >= 25:
        return { level: "Very Severe", message: "Very severe eczema symptoms. Please consult a healthcare provider immediately." };
      default:
        return { level: "Unknown", message: "Score out of range. Please check your input." };
    }
  };

  const data = {
    labels: poemScores.length ? poemScores.map(score => score.date) : ["No Data"],
    datasets: [
      {
        data: poemScores.length ? poemScores.map(score => score.score) : [0],
        color: (opacity = 1) => `rgba(133, 211, 192, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(133, 211, 192, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "6", strokeWidth: "2", stroke: "#ffa726" },
  };

  return (
    <View style={styles.container}>
      <BackArrow onPress={() => router.push('/myaccount')} />
      <ScrollView>
        <Text style={styles.header}>My Record</Text>

        {/* Verified Badge */}
        <View style={styles.badgeContainer}>
          {profile.isVerified ? (
            <View style={styles.verifiedBadge}>
              <FontAwesome name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.badgeText}>Verified User</Text>
            </View>
          ) : (
            <View style={styles.notVerifiedBadge}>
              <FontAwesome name="times-circle" size={20} color="#F44336" />
              <Text style={styles.badgeText}>Not Yet Verified</Text>
            </View>
          )}
        </View>

        {/* Personal Information */}
        <Text style={styles.name}>{profile.firstName} {profile.lastName}</Text>
        <Text style={styles.age}>Age: {profile.age} years</Text>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoContainer}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoText}>{profile.email}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Phone Number:</Text>
            <Text style={styles.infoText}>{profile.phoneNumber}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>POEM Score Trend</Text>
        <LineChart
          data={data}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />

        {/* Treatment and Medication Section */}
        <Text style={styles.sectionTitle}>Medications & Treatment</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#85D3C0" />
        ) : latestSurvey ? (
          <View style={styles.treatmentContainer}>
            <Text style={styles.treatmentHeader}>Previous Survey Info</Text>
            <Text style={styles.treatmentText}>Score: {latestSurvey.score}</Text>
            <Text style={styles.treatmentText}>Severity Level: {latestSurvey.severity.level}</Text>
            <Text style={styles.treatmentMessage}>{latestSurvey.severity.message}</Text>
          </View>
        ) : (
          <Text style={styles.noSurveyText}>No previous survey found.</Text>
        )}
      </ScrollView>
      {/* <BottomNav /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    backgroundColor: 'white',
  },
  header: {
    fontSize: 24,
    color: '#85D3C0',
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 20,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  notVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    marginLeft: 5,
    fontSize: 16,
    color: "#333",
  },
  name: {
    fontSize: 22,
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 10,
  },
  age: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 10,
    marginTop: 20,
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoBlock: {
    width: '48%', // Adjusts to fit two blocks per row
    backgroundColor: 'rgba(195, 239, 228, 0.5)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'black',
    textAlign: 'center', // Center align the label text
    marginBottom: 5,
  },
  infoText: {
    fontSize: 12,
    color: 'black',
    textAlign: 'justify', // Center align the info text
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  treatmentContainer: {
    backgroundColor: '#E8F4F2',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  treatmentHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#74BDB3',
    marginBottom: 10,
    textAlign: 'center',
  },
  treatmentText: {
    fontSize: 16,
    color: "black",
    marginBottom: 5,
    textAlign: 'center',
  },
  treatmentMessage: {
    fontSize: 14,
    color: "#555",
    textAlign: 'center',
    marginTop: 10,
  },
  noSurveyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginVertical: 20,
  },
});


export default MyRecordScreen;
