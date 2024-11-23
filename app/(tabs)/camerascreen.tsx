import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
} from "react-native";
import BackArrow from "../components/BackArrow";
import BottomNav from "../components/BottomNav";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getAuth } from "firebase/auth";
import { firestore, storage } from "../firebaseConfig";
import { collection, addDoc, setDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useTranslation } from "react-i18next";

const getAccessToken = async () => {
  const user = getAuth().currentUser;
  if (user) {
    console.log(user);
    const token = await user.getIdToken(true);
    console.log("Firebase ID Token:", token);
    return token;
  }
  throw new Error("User not authenticated");
};

const screenWidth = Dimensions.get("window").width;

const CameraScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [imageUri, setImageUri] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [modalTitle, setModalTitle] = useState<any | string>("Processing");
  const [modalMessage, setModalMessage] = useState<any | string>(null);
  const [closeButtonVisible, setCloseButtonVisible] = useState(false);

  // Function to open the camera
  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.granted) {
      const result = await ImagePicker.launchCameraAsync();
      if (!result.cancelled && result.assets && result.assets[0].uri) {
        setImageUri(result.assets[0].uri); // Set the captured image URI
        console.log("Camera image URI:", result.assets[0].uri);
      } else {
        console.log("Camera capture was cancelled or URI is undefined");
        Alert.alert("camera.alerts.camera_cancelled");
      }
    } else {
      Alert.alert(t("camera.alerts.camera_permission_not_granted"));
    }
  };

  const openImageGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted) {
      const result = await ImagePicker.launchImageLibraryAsync();
      if (!result.cancelled && result.assets && result.assets[0].uri) {
        setImageUri(result.assets[0].uri); // Set the selected image URI
        console.log("Gallery image URI:", result.assets[0].uri);
      } else {
        console.log("Image selection was cancelled or URI is undefined");
        Alert.alert(t("camera.alerts.image_selection_cancelled"));
      }
    } else {
      Alert.alert(t("camera.alerts.gallery_permission_not_granted"));
    }
  };

  // Function to save image to Firebase Storage and Firestore
  const saveImage = async () => {
    if (!imageUri) {
      Alert.alert(t("camera.alerts.no_image_selected"));
      return;
    }

    try {
      const user = getAuth().currentUser;
      const userEmail = user?.email;

      if (!userEmail) {
        Alert.alert(t("camera.alerts.user_not_logged_in"));
        return;
      }

      setModalVisible(true);
      setModalTitle("Processing...");
      setCloseButtonVisible(false);
      setModalMessage("Saving image...");
      setAnalysisResult(null);

      // Create a unique path for each image
      const imageName = `images/${userEmail}/${Date.now()}_image.jpg`;
      const storageRef = ref(storage, imageName);

      console.log("Fetching image as blob...");
      const response = await fetch(imageUri);
      const blob = await response.blob();
      console.log("Uploading blob to Firebase Storage...");
      await uploadBytes(storageRef, blob);

      console.log("Getting download URL...");
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Download URL:", downloadURL);

      // Save the image URL to Firestore
      const imagesCollectionRef = collection(
        firestore,
        "users",
        userEmail,
        "images"
      );
      await addDoc(imagesCollectionRef, {
        imageUrl: downloadURL,
        timestamp: new Date().toISOString(),
      });

      Alert.alert(t("camera.alerts.image_saved"));

      // Now analyze the severity by sending the image to Vertex AI
      const base64Image = await getBase64FromUri(imageUri);
      analyzeSeverity(base64Image);
    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert(t("camera.alerts.image_save_failed"));
    }
  };

  const analyzeSeverity = async (base64Image) => {
    setModalMessage("Analyzing image...");
    const BACKEND_URL =
      "https://us-central1-eczemacare-1195e.cloudfunctions.net/predictImage";

    const body = {
      base64Image: base64Image,
    };

    try {
      const token = await getAccessToken(); // Firebase Auth token

      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setModalTitle("Error");
        setModalMessage(`Cloud Run response error: ${response.statusText}`);
        setCloseButtonVisible(true);
        throw new Error(`Cloud Run response error: ${response.statusText}`);
      }

      const result = await response.json();

      setModalTitle("Success");
      setModalMessage(`Saved and analyzed image.`);
      saveAnalysis(result);
      console.log("Cloud Run results:", result);
    } catch (error) {
      setModalTitle("Error");
      setModalMessage(
        `Something went wrong in connecting to Cloud Run: ${error}`
      );
      setCloseButtonVisible(true);
      console.error("Something went wrong in connecting to Cloud Run:", error);
      Alert.alert("Prediction Error", "Failed to analyze image.");
    }
  };

  const saveAnalysis = async (analysisResult) => {
    try {
      const user = getAuth().currentUser;
      const userEmail = user?.email;

      if (!userEmail) {
        console.error("No user is logged in.");
        Alert.alert("Error", "No user is currently logged in.");
        return;
      }

      const timestamp = new Date();
      const timestampString = timestamp.toISOString();

      const docRef = doc(
        firestore,
        "users",
        userEmail,
        "skinAnalysis",
        timestampString
      );

      // Save analysis result to Firestore
      await setDoc(docRef, {
        result: analysisResult,
        timestamp: timestamp,
      });

      console.log("Analysis saved successfully:", analysisResult);

      // Update modal and navigate
      setModalTitle("Success");
      setModalMessage("Analysis saved successfully.");
      setModalVisible(false);
      router.push("/treatment");
    } catch (error) {
      console.error("Error saving analysis to Firestore:", error);
      setModalTitle("Error");
      setModalMessage("Failed to save analysis. Please try again.");
      setCloseButtonVisible(true);
      Alert.alert("Error", "Failed to save analysis to Firestore.");
    }
  };

  const getBase64FromUri = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
    }
  };

  return (
    <View style={styles.container}>
      <BackArrow onPress={() => router.push("/home")} />
      <View style={styles.header}>
        <Text style={styles.headerText}>CAMERA</Text>
      </View>

      {/* Display the selected image in the placeholder area if it exists */}
      <TouchableOpacity
        style={styles.cameraPlaceholder}
        onPress={!imageUri ? openCamera : null}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.cameraPlaceholderImage}
          />
        ) : (
          <Text style={styles.placeholderText}>
            {t("camera.placeholder_text")}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={openCamera}>
          <Text style={styles.buttonText}>{t("camera.retake_button")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={openImageGallery}
        >
          <Text style={styles.buttonText}>
            {t("camera.image_upload_button")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={saveImage}>
          <Text style={styles.buttonText}>{t("camera.save_button")}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.galleryButton}
        onPress={() => router.push("/gallery")}
      >
        <Text style={styles.galleryText}>{t("camera.gallery_button")}</Text>
      </TouchableOpacity>

      <BottomNav />

      {/* Result modal */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.headerText}>{modalTitle}</Text>
          <Text style={styles.message}>{modalMessage}</Text>
          {closeButtonVisible && (
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setModalVisible(false);
              }}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    paddingTop: 20,
  },
  header: {
    fontSize: 32,
    color: "#85D3C0",
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 20,
  },
  headerText: {
    fontSize: 32,
    color: "#85D3C0",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 3,
  },
  cameraPlaceholder: {
    width: screenWidth - 40,
    height: 330,
    backgroundColor: "black",
    borderRadius: 13,
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraPlaceholderImage: {
    width: "100%",
    height: "100%",
    borderRadius: 13,
    resizeMode: "cover",
  },
  placeholderText: {
    color: "white",
    fontSize: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: "#85D3C0",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "400",
  },
  galleryButton: {
    backgroundColor: "rgba(132.89, 211.21, 192.41, 0.42)",
    borderRadius: 13,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  galleryText: {
    color: "#5D9386",
    fontSize: 14,
    fontWeight: "400",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#E8E8E8",
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 4,
  },
  message: {
    fontSize: 16,
    color: "grey",
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 10,
  },
  closeModalButton: {
    backgroundColor: "#85D3C0",
    borderRadius: 24,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    width: 150,
    marginTop: 20,
  },
});

export default CameraScreen;
