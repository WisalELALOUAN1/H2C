import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-red-100 via-beige-100 to-brown-100 text-brown-900 px-6">
      <div className="text-center">
        <h1 className="text-7xl font-extrabold text-red-700 drop-shadow-lg">404</h1>
        <p className="mt-4 text-2xl font-semibold text-brown-800">Page introuvable</p>
        <p className="mt-2 text-md text-brown-600">
          Oups ! La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="inline-block mt-6 px-6 py-3 bg-red-600 text-white font-medium rounded-xl shadow-md hover:bg-red-700 transition"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
