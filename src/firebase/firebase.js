import { initializeApp } from "firebase/app";
import {
	getAuth,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	onAuthStateChanged,
	signOut,
} from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
	apiKey: "AIzaSyCYeIbDzTfZnXjJkfJG6EQynOWkblj4msQ",
	authDomain: "scottish-attendance.firebaseapp.com",
	projectId: "scottish-attendance",
	storageBucket: "scottish-attendance.firebasestorage.app",
	messagingSenderId: "375230490779",
	appId: "1:375230490779:web:637d2d9205133c270afe3e",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
	auth,
	db,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	onAuthStateChanged,
	signOut,
	collection,
	addDoc,
	getDocs,
	query,
	where,
};
