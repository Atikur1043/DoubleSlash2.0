"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

export default function StudentPage() {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) return;

      try {
        const studentRef = doc(db, "teachers", id);
        const studentSnap = await getDoc(studentRef);

        if (studentSnap.exists()) {
          setStudent(studentSnap.data());
          console.log(student);
        } else {
          setStudent(null);
        }
      } catch (err) {
        setError("Failed to fetch student data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!student) return <p>Student not found.</p>;

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold">{student.name}</h1>
      <p>Email: {student.email}</p>
    </div>
  );
}
