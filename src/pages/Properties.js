import { collection, onSnapshot, query, where } from "firebase/firestore";
import React from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

const Properties = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    // Create a query to fetch properties for the current user
    const q = query(
      collection(db, "properties"),
      where("userId", "==", user.uid)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const propertyList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProperties(propertyList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching properties:", error);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [user]);

  const handlePropertyClick = (propertyId) => {
    navigate(`/properties/${propertyId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <button
              onClick={() => navigate("/properties/new")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Property
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500 mb-4">No properties found</p>
              <button
                onClick={() => navigate("/properties/new")}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Your First Property
              </button>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {properties.map((property) => (
                  <li key={property.id}>
                    <div
                      onClick={() => handlePropertyClick(property.id)}
                      className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-600 text-lg font-semibold">
                                {property.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">
                              {property.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {property.address}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-500">
                            {property.units} units
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              property.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : property.status === "Inactive"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {property.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Properties;
