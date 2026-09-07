// pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SkeletonCard from "../components/Loaders/SkeletonCard";
import ErrorState from "../components/ErrorState";



export default function Home() {
  const navigate = useNavigate();

  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState([]);

  const [error, setError] = useState("");


  return (
    <>
      {/* ================= HERO SECTION ================= */}
      <section className="hero-section py-5">

      </section>
      <hr />

    </>
  );
}
