import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome"; // Or another icon library
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import BottomNav from "../components/BottomNav";
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  query,
  collection,
  orderBy,
  getDocs,
  limit,
  where,
} from "firebase/firestore";
import { firestore } from "../firebaseConfig";
import { useTranslation } from "react-i18next";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [fullName, setFullName] = useState("");
  const [user, setUser] = useState<any>(null);
  const [hasNotif, setHasNotif] = useState(false);

  interface User {
    id: string;
    name: string;
    email: string;
  }

  useFocusEffect(
    React.useCallback(() => {
      const fetchUserData = async () => {
        const auth = getAuth();
        setUser(auth.currentUser);

        if (user) {
          setUserEmail(user.email ?? "Unknown Email");
          setProfileImage(user.photoURL || "https://via.placeholder.com/72x72");

          try {
            const userDocRef = doc(firestore, "users", user.email ?? "");
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              setFullName(`${userData.firstName} ${userData.lastName}`);
              i18n.changeLanguage(userData.language);
            } else {
              Alert.alert("Error", "No user data found in Firestore.");
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
            Alert.alert(
              "Error",
              "Failed to retrieve user data from Firestore."
            );
          }
        }
      };

      fetchUserData();
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      const fetchNotifications = async () => {
        console.log("Fetching notifs");
        if (user) {
          try {
            // Get latest notification
            const notifsRef = collection(
              firestore,
              "users",
              user.email,
              "notifications"
            );

            const hasNotifQuery = query(
              notifsRef,
              where("opened", "==", false),
              limit(1)
            );

            const querySnapshot = await getDocs(hasNotifQuery);
            console.log(1);

            // Get latest survey timestamp
            if (!querySnapshot.empty) {
              console.log(2);
              const notifDoc = querySnapshot.docs[0].data();
              console.log(notifDoc);

              setHasNotif(true);
            } else {
              setHasNotif(false);
              console.log(3);
            }
            console.log(`Has notif: ${hasNotif}`);
          } catch (error) {
            console.error("Error fetching user data:", error);
            Alert.alert(
              "Error",
              "Failed to retrieve user data from Firestore."
            );
          }
        }
      };

      fetchNotifications();
    }, [user])
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Profile Section */}
        <View style={styles.header}>
          <Image
            style={styles.profileImage}
            source={require("../../assets/logos/EczemaCareLogoG.png")}
          />
          <View style={styles.greeting}>
            <Text style={styles.welcomeText}>{t("home.welcome")}</Text>
            <Text style={styles.welcomeText}>{fullName || "Guest"}</Text>
          </View>
          <View style={styles.iconContainer}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => router.push("/notification")}
            >
              <Icon name="bell" size={20} color="#5A5858" />
              {hasNotif && <View style={styles.notificationDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => router.push("/settings")}
            >
              <Icon name="cog" size={20} color="#5A5858" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Header Title Section */}
        <View style={styles.titleCard}>
          <Text style={styles.headerTitle}>{t("home.eczema_care.title")}</Text>
          <Text style={styles.headerInfo}>
            {t("home.eczema_care.description")}
          </Text>
        </View>

        {/* Sections for Learn, FAQs, About Us */}
        <TouchableOpacity
          style={styles.infoCard}
          onPress={() => router.push("/learn")}
        >
          <Text style={styles.infoTitle}>{t("home.learn.title")}</Text>
          <Text style={styles.infoText}>{t("home.learn.description")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoCard}
          onPress={() => router.push("/faqs")}
        >
          <Text style={styles.infoTitle}>{t("home.how_to_use.title")}</Text>
          <Text style={styles.infoText}>
            {t("home.how_to_use.description")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoCard}
          onPress={() => router.push("/aboutus")}
        >
          <Text style={styles.infoTitle}>{t("home.doctors.title")}</Text>
          <Text style={styles.infoText}>{t("home.doctors.description")}</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    // alignItems: 'center',
    paddingTop: 20,
  },
  scrollViewContent: {
    paddingBottom: 80, // Adjust this value to fit the height of your BottomNav
  },
  header: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
  },
  profileImage: {
    width: 65,
    height: 65,
    borderRadius: 36,
    marginTop: 22,
  },
  greeting: {
    marginLeft: 20,
    marginTop: 22,
  },
  welcomeText: {
    fontSize: 15,
    color: "#85D3C0",
    fontWeight: "700",
  },
  userName: {
    fontSize: 14,
    fontWeight: "400",
    color: "#303030",
  },
  iconContainer: {
    marginLeft: "auto",
    flexDirection: "row",
    marginTop: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    backgroundColor: "#C3EFE5",
    borderRadius: 9999,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 50,
    backgroundColor: "red",
  },

  Container: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginVertical: 20,
  },

  titleCard: {
    backgroundColor: "#74BDB3",
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 17,
    marginTop: 15,
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 36,
    fontWeight: "600",
    color: "#DDF9F3",
    marginTop: 10,
    marginBottom: 10,
  },

  headerInfo: {
    fontSize: 17,
    color: "#DDF9F3",
    fontWeight: "400",
    marginBottom: 10,
  },

  infoCard: {
    backgroundColor: "#C3EFE5",
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 17,
  },
  infoTitle: {
    fontSize: 32,
    fontWeight: "600",
    color: "#5D9386",
  },
  infoText: {
    fontSize: 13,
    fontWeight: "300",
    color: "#5A5858",
  },
});
