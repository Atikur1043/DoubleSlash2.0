"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { useParams } from "next/navigation";
import Link from "next/link"; // Import the Link component
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/firebase";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function StudentDashboard() {
  const { id: studentId } = useParams(); // Use `studentId` from URL params
  const [teacherEmail, setTeacherEmail] = useState("");
  const [evaluatedSets, setEvaluatedSets] = useState([]);
  const [nonEvaluatedSets, setNonEvaluatedSets] = useState([]);
  const [pendingSets, setPendingSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTeacherEmail, setNewTeacherEmail] = useState(""); // State for new teacher email
  const [error, setError] = useState<string | null>(null); // State for error messages

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Step 1: Fetch Student Data using Student ID
        const studentDocRef = doc(db, "students", studentId);
        const studentDocSnap = await getDoc(studentDocRef);

        if (!studentDocSnap.exists()) {
          console.log("No student found with ID:", studentId);
          setLoading(false);
          return;
        }

        const studentData = studentDocSnap.data();
        const tEmail = studentData.teachers[0]; // Assuming `teachers` field contains the teacher's email
        setTeacherEmail(tEmail);

        // Step 2: Fetch Question Sets associated with the teacher
        const questionSetQuery = query(
          collection(db, "question_sets"),
          where("t_email", "==", String(tEmail))
        );
        const questionSetSnapshot = await getDocs(questionSetQuery);

        if (!questionSetSnapshot.empty) {
          const sets = questionSetSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Step 3: Fetch Answer Sets submitted by the student
          const answerSetQuery = query(
            collection(db, "answer_sets"),
            where("student_id", "==", studentId)
          );
          const answerSetSnapshot = await getDocs(answerSetQuery);

          const submittedSetIds = answerSetSnapshot.docs.map(
            (doc) => doc.data().qset_id
          );

          // Step 4: Filter out pending sets
          const pending = sets.filter(
            (set) => !submittedSetIds.includes(set.id)
          );
          setPendingSets(pending);

          // Step 5: Filter submitted sets into evaluated and non-evaluated
          const submittedSets = sets.filter((set) =>
            submittedSetIds.includes(set.id)
          );
          const evaluated = submittedSets.filter((set) => set.evaluated);
          const nonEvaluated = submittedSets.filter((set) => !set.evaluated);

          setEvaluatedSets(evaluated);
          setNonEvaluatedSets(nonEvaluated);
        } else {
          console.log("No question sets found for teacher:", teacherEmail);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, [studentId, teacherEmail]);

  // Function to add a teacher's email to the student's document
  const addTeacherEmail = async () => {
    if (!newTeacherEmail) {
      setError("Please enter a valid email.");
      return;
    }

    try {
      const studentDocRef = doc(db, "students", studentId);
      const studentDocSnap = await getDoc(studentDocRef);

      if (studentDocSnap.exists()) {
        const studentData = studentDocSnap.data();
        const teachers = studentData.teachers || []; // Get existing teachers array

        // Check if the teacher's email already exists
        if (teachers.includes(newTeacherEmail)) {
          setError("This teacher is already added.");
          return;
        }

        // Add the new teacher's email to the array
        await updateDoc(studentDocRef, {
          teachers: [...teachers, newTeacherEmail],
        });

        setNewTeacherEmail(""); // Clear the input field
        setError(null); // Clear any previous error
        alert("Teacher added successfully!");
      } else {
        setError("Student not found.");
      }
    } catch (error) {
      console.error("Error adding teacher:", error);
      setError("Failed to add teacher. Please try again.");
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8 pb-20 gap-6 sm:p-20 font-geist">
      <Button
        onClick={() => {
          signOut(auth);
          router.push("/login");
        }}
      >
        Logout
      </Button>

      {/* Add Teacher Email Section */}
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">Add Teacher</h1>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter teacher's email"
            value={newTeacherEmail}
            onChange={(e) => setNewTeacherEmail(e.target.value)}
          />
          <Button onClick={addTeacherEmail}>Add Teacher</Button>
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>

      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">Pending Tests</h1>
        {pendingSets.length > 0 ? (
          pendingSets.map((set) => (
            <Link
              key={set.id}
              href={`/student/submitpaper/${
                set.id
              }?studentId=${encodeURIComponent(studentId)}`} // Pass qset_id and studentId
              passHref
            >
              <Card className="w-full p-4 bg-white rounded-xl shadow-md mb-4 cursor-pointer hover:bg-gray-50">
                <h3 className="text-lg font-medium text-gray-800">
                  {set.title}
                </h3>
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-gray-500">No pending tests.</p>
        )}
      </div>
      <h1 className="text-2xl font-bold text-gray-700 mb-6">
        Your Submitted Sets
      </h1>

      <div className="w-full max-w-3xl">
        <h2 className="text-xl font-semibold text-green-600 mb-4">Evaluated</h2>
        {evaluatedSets.length > 0 ? (
          evaluatedSets.map((set) => (
            <Card
              key={set.id}
              className="w-full p-4 bg-white rounded-xl shadow-md mb-4"
            >
              <h3 className="text-lg font-medium text-gray-800">{set.title}</h3>
            </Card>
          ))
        ) : (
          <p className="text-gray-500">No evaluated sets.</p>
        )}
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="text-xl font-semibold text-red-600 mb-4">
          Not Evaluated
        </h2>
        {nonEvaluatedSets.length > 0 ? (
          nonEvaluatedSets.map((set) => (
            <Card
              key={set.id}
              className="w-full p-4 bg-white rounded-xl shadow-md mb-4"
            >
              <h3 className="text-lg font-medium text-gray-800">{set.title}</h3>
            </Card>
          ))
        ) : (
          <p className="text-gray-500">No pending sets.</p>
        )}
      </div>
    </div>
  );
}