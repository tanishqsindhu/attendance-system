import { initializeApp } from "firebase/app";
import {
	getAuth,
	signInWithRedirect,
	signInWithPopup,
	GoogleAuthProvider,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
} from "firebase/auth";
import {
	getFirestore,
	doc,
	getDoc,
	setDoc,
	collection,
	writeBatch,
	query,
	getDocs,
} from "firebase/firestore";

const firebaseConfig = {
	apiKey: "AIzaSyCYeIbDzTfZnXjJkfJG6EQynOWkblj4msQ",
	authDomain: "scottish-attendance.firebaseapp.com",
	projectId: "scottish-attendance",
	storageBucket: "scottish-attendance.firebasestorage.app",
	messagingSenderId: "375230490779",
	appId: "1:375230490779:web:637d2d9205133c270afe3e",
};

const firebaseApp = initializeApp(firebaseConfig);

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
	prompt: "select_account",
});

export const auth = getAuth();
export const signInWithGooglePopup = () => signInWithPopup(auth, googleProvider);
export const signInWithGoogleRedirect = () => signInWithRedirect(auth, googleProvider);

export const db = getFirestore();

export const addCollectionAndDocuments = async (collectionKey, objectsToAdd, field) => {
	const collectionRef = collection(db, collectionKey);
	const batch = writeBatch(db);

	objectsToAdd.forEach((object) => {
		const docRef = doc(collectionRef, object.date.toString());
		batch.set(docRef, object);
	});

	await batch.commit();
	console.log("done");
};

export const getMachineData = async () => {
	const collectionRef = collection(db, "categories");
	const q = query(collectionRef);

	const querySnapshot = await getDocs(q);
	return querySnapshot.docs.map((docSnapshot) => docSnapshot.data());
};

export const createUserDocumentFromAuth = async (userAuth, additionalInformation = {}) => {
	if (!userAuth) return;

	const userDocRef = doc(db, "users", userAuth.uid);

	const userSnapshot = await getDoc(userDocRef);

	if (!userSnapshot.exists()) {
		const { displayName, email } = userAuth;
		const createdAt = new Date();

		try {
			await setDoc(userDocRef, {
				displayName,
				email,
				createdAt,
				...additionalInformation,
			});
		} catch (error) {
			console.log("error creating the user", error.message);
		}
	}

	return userDocRef;
};

export const createAuthUserWithEmailAndPassword = async (email, password) => {
	if (!email || !password) return;

	return await createUserWithEmailAndPassword(auth, email, password);
};

export const signInAuthUserWithEmailAndPassword = async (email, password) => {
	if (!email || !password) return;

	return await signInWithEmailAndPassword(auth, email, password);
};

export const signOutUser = async () => await signOut(auth);

export const onAuthStateChangedListener = (callback) => onAuthStateChanged(auth, callback);

export const checkAttendanceExists = async (branchId, yearMonth) => {
	try {
		const attendanceRef = doc(db, "branches", branchId, "attendanceLogs", yearMonth);
		const existingDoc = await getDoc(attendanceRef);
		return existingDoc.exists();
	} catch (error) {
		console.error("Error checking attendance:", error);
		throw error;
	}
};

export const saveAttendanceData = async (branchId, yearMonth, attendanceData, forceOverwrite) => {
	try {
		const attendanceRef = doc(db, "branches", branchId, "attendanceLogs", yearMonth);
		const existingDoc = await getDoc(attendanceRef);

		// If document exists and not forcing overwrite, reject the request
		if (existingDoc.exists() && !forceOverwrite) {
			throw new Error(`Attendance data for ${yearMonth} already exists.`);
		}

		// Merge with existing data if overwriting
		const newRecords =
			existingDoc.exists() && forceOverwrite
				? { ...existingDoc.data(), ...attendanceData }
				: attendanceData;

		await setDoc(attendanceRef, newRecords);
		console.log(`✅ Attendance for ${yearMonth} saved successfully.`);
	} catch (error) {
		console.error("Error saving attendance:", error);
		throw error;
	}
};

export const addEmployeeDetails = async (formData) => {
	console.log(formData);
	const employeesCollectionRef = collection(db, `branches/${formData.branchId}/employees`);
	const employeeRef = doc(employeesCollectionRef, formData.employeeId);
	console.log(employeeRef);
	const existingDoc = await getDoc(employeeRef);
	console.log(existingDoc);
	if (existingDoc.exists()) {
		console.log("document exists");
		return "Employee with this ID already exists!";
	}
	try {
		console.log("document adding");
		await setDoc(employeeRef, { ...formData });
		return "Employee added successfully!";
	} catch (error) {
		console.error("Error adding employee: ", error);
		return "Failed to add employee";
	}
};

/**
 * Fetches attendance logs for a branch & month-year.
 */
export const getAttendanceLogs = async (branchId, monthYear) => {
	try {
		const docRef = doc(db, `branches/${branchId}/attendanceLogs/${monthYear}`);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? docSnap.data() : null;
	} catch (error) {
		console.error("Error fetching attendance logs:", error);
		return null;
	}
};

/**
 * Fetches all employees and their shift timings.
 */
export const getEmployees = async (branchId) => {
	try {
		const employeesRef = collection(db, `branches/${branchId}/employees`);
		const snapshot = await getDocs(employeesRef);
		const employees = {};
		snapshot.forEach((doc) => {
			employees[doc.id] = doc.data();
		});
		return employees;
	} catch (error) {
		console.error("Error fetching employees:", error);
		return {};
	}
};

/**
 * Stores processed attendance inside each employee's document.
 */
export const saveProcessedAttendance = async (branchId, monthYear, processedAttendance) => {
	try {
		const updates = Object.entries(processedAttendance).map(async ([employeeId, data]) => {
			const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);
			const employeeDoc = await getDoc(employeeRef);

			// Merge existing attendance data with new data
			const currentAttendance = employeeDoc.exists() ? employeeDoc.data().attendance || {} : {};
			currentAttendance[monthYear] = data; // Store attendance under month-year

			await setDoc(employeeRef, { attendance: currentAttendance }, { merge: true });
		});

		await Promise.all(updates);
		console.log("Attendance saved successfully.");
	} catch (error) {
		console.error("Error saving attendance:", error);
	}
};

// Fetch Employee Details
export const getEmployeeDetails = async (branchId, employeeId) => {
	const employeeRef = doc(db, `branches/${branchId}/employees/${employeeId}`);
	const employeeDoc = await getDoc(employeeRef);
	return employeeDoc.exists ? employeeDoc.data() : null;
};
