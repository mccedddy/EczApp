import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router"; // Expo Router
import { useFocusEffect } from "expo-router";
import BackArrow from "../components/BackArrow";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { firestore } from "../firebaseConfig";
import { useTranslation } from "react-i18next";

const EditProfile = () => {
  const { t } = useTranslation();
  const router = useRouter(); // For navigation
  // Define states for text fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      const fetchUserData = async () => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          const userDocRef = doc(firestore, "users", user.email ?? "");
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setFirstName(userData.firstName ?? t("account.no_first_name"));
            setLastName(userData.lastName ?? t("account.no_last_name"));
            setPhoneNumber(
              userData.mobileNumber ?? t("account.no_phone_number")
            );
            setEmail(userData.email ?? user?.email);
          } else {
            console.log("No user data found in Firestore.");
          }
        }
      };

      fetchUserData();
    }, [])
  );
  // Function to handle saving profile updates
  const handleSave = async () => {
    try {
      const user = getAuth().currentUser;

      // Update details in firestore
      const docRef = doc(firestore, "users", user?.email ?? "");
      await updateDoc(docRef, {
        lastName: lastName,
        firstName: firstName,
        mobileNumber: phoneNumber,
      });

      Alert.alert(
        "Profile Saved",
        `Name: ${firstName} ${lastName}\nPhone: ${phoneNumber}\nEmail: ${email}`
      );
    } catch (error) {
      console.error("Error saving profile: ", error);
      alert("Failed to save profile.");
    }

    router.push("/myaccount");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("account.edit_profile")}</Text>

      {/* First Name Input */}
      <TextInput
        style={styles.input}
        placeholder={t("account.first_name")}
        value={firstName}
        onChangeText={setFirstName}
      />

      {/* Last Name Input */}
      <TextInput
        style={styles.input}
        placeholder={t("account.last_name")}
        value={lastName}
        onChangeText={setLastName}
      />

      {/* Phone Number Input */}
      <TextInput
        style={styles.input}
        placeholder={t("account.phone_number")}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad" // Ensure correct keyboard type on mobile
      />

      {/* Email Input */}
      <TextInput
        style={styles.input}
        placeholder={t("account.email")}
        value={email}
        keyboardType="email-address" // Ensure correct keyboard type for email
      />

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{t("account.save")}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
    fontSize: 18,
  },
  saveButton: {
    backgroundColor: "#85D3C0",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default EditProfile;
