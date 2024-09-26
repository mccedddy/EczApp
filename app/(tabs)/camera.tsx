import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BackArrow from '../components/BackArrow'; // If you have a custom BackArrow component
import BottomNav from '../components/BottomNav';
import { useRouter } from 'expo-router'; 


const screenWidth = Dimensions.get('window').width;
const router = useRouter();
const CameraScreen = () => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
       <BackArrow onPress={() => router.push('/home')} />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.header}>CAMERA</Text>
                <Text style={styles.description}>
                    Image recognition explanation and instructions *
                </Text>
                <View style={styles.infoContainer}>
                    <View style={styles.infoBlock}></View>
                    <View style={styles.infoBlock}></View>
                    <View style={styles.infoBlock}></View>
                </View>
                <TouchableOpacity style={styles.button} onPress={() => router.push('/camerascreen')} >
                {/* onPress={() => console.log('Proceed')} */}
                    <Text style={styles.buttonText}>Proceed</Text>
                </TouchableOpacity>
            </ScrollView>
            <BottomNav /> 
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        padding: 10
    },
    scrollContainer: {
        alignItems: 'center',
        paddingBottom: 20, // Add bottom padding to avoid content being cut off
    },
    header: {
        fontSize: 32,
        color: '#85D3C0',
        fontWeight: '600',
        textAlign: 'center',
        marginVertical: 20
    },
    description: {
        fontSize: 16,
        color: 'black',
        textAlign: 'center',
        marginBottom: 20
    },
    infoContainer: {
        width: screenWidth - 40,
        alignItems: 'center',
        marginBottom: 20
    },
    infoBlock: {
        width: '100%',
        height: 100,
        backgroundColor: 'rgba(195, 239, 228, 0.5)',
        borderRadius: 10,
        marginBottom: 10
    },
    button: {
        backgroundColor: '#85D3C0',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 30,
        width: screenWidth - 60,
        alignItems: 'center',
        marginTop: 20 // Adjusting margin to create more space above the button
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600'
    }
});

export default CameraScreen;
