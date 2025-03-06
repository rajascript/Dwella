import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import React from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

const NewTenant = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [properties, setProperties] = React.useState([]);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    propertyId: "",
    unitNumber: "",
    leaseStart: "",
    leaseEnd: "",
    rentAmount: "",
    status: "Active",
    baseElectricityMultiplier: "7",
    startMonthMeterReading: "",
  });
  const [error, setError] = React.useState("");
  const [countryCode, setCountryCode] = React.useState("91");

  // Country codes data
  const countryCodes = [
    { code: "91", name: "India (+91)" },
    { code: "1", name: "United States (+1)" },
    { code: "44", name: "United Kingdom (+44)" },
    { code: "61", name: "Australia (+61)" },
    { code: "65", name: "Singapore (+65)" },
    { code: "971", name: "UAE (+971)" },
    { code: "966", name: "Saudi Arabia (+966)" },
    { code: "974", name: "Qatar (+974)" },
    { code: "973", name: "Bahrain (+973)" },
    { code: "968", name: "Oman (+968)" },
    { code: "965", name: "Kuwait (+965)" },
  ];

  // Fetch properties for the dropdown
  React.useEffect(() => {
    const fetchProperties = async () => {
      try {
        const q = query(
          collection(db, "properties"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const propertyList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProperties(propertyList);
      } catch (error) {
        console.error("Error fetching properties:", error);
        setError("Failed to load properties");
      }
    };

    fetchProperties();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCountryCodeChange = (e) => {
    setCountryCode(e.target.value);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, ""); // Only allow numbers
    if (value.length <= 10) {
      // Limit to 10 digits
      setFormData((prev) => ({
        ...prev,
        phone: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Get the property name for the tenant record
      const selectedProperty = properties.find(
        (p) => p.id === formData.propertyId
      );

      // Format phone number with country code
      const formattedPhone = `+${countryCode} ${formData.phone}`;

      // Create tenant in Firestore
      const tenantData = {
        ...formData,
        phone: formattedPhone,
        userId: user.uid,
        propertyName: selectedProperty?.name || "",
        rentAmount: parseFloat(formData.rentAmount),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "tenants"), tenantData);

      // Reset form and redirect
      setFormData({
        name: "",
        email: "",
        phone: "",
        propertyId: "",
        unitNumber: "",
        leaseStart: "",
        leaseEnd: "",
        rentAmount: "",
        status: "Active",
        baseElectricityMultiplier: "7",
        startMonthMeterReading: "",
      });

      navigate("/tenants");
    } catch (error) {
      console.error("Error creating tenant:", error);
      setError("Failed to create tenant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Add New Tenant</h1>
            <button
              onClick={() => navigate("/tenants")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Tenants
            </button>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Tenant Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Phone Number
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <select
                      value={countryCode}
                      onChange={handleCountryCodeChange}
                      className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm"
                    >
                      {countryCodes.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="Enter 10-digit number"
                      maxLength="10"
                      pattern="[0-9]{10}"
                      className="flex-1 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter a 10-digit phone number
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="propertyId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Property
                  </label>
                  <select
                    name="propertyId"
                    id="propertyId"
                    required
                    value={formData.propertyId}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  >
                    <option value="">Select a property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="unitNumber"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Unit Number
                  </label>
                  <input
                    type="text"
                    name="unitNumber"
                    id="unitNumber"
                    required
                    value={formData.unitNumber}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="leaseStart"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Lease Start Date
                    </label>
                    <input
                      type="date"
                      name="leaseStart"
                      id="leaseStart"
                      required
                      value={formData.leaseStart}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="leaseEnd"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Lease End Date
                    </label>
                    <input
                      type="date"
                      name="leaseEnd"
                      id="leaseEnd"
                      required
                      value={formData.leaseEnd}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rentAmount"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Monthly Rent Amount
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      name="rentAmount"
                      id="rentAmount"
                      required
                      min="0"
                      step="0.01"
                      value={formData.rentAmount}
                      onChange={handleChange}
                      className="mt-1 block w-full pl-7 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="baseElectricityMultiplier"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Base Electricity Multiplier
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="baseElectricityMultiplier"
                      id="baseElectricityMultiplier"
                      required
                      min="0"
                      step="0.01"
                      value={formData.baseElectricityMultiplier}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Default value is 7. This multiplier will be used to
                    calculate electricity charges.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="startMonthMeterReading"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Start Month Meter Reading
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="startMonthMeterReading"
                      id="startMonthMeterReading"
                      required
                      min="0"
                      step="0.01"
                      value={formData.startMonthMeterReading}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter the initial meter reading when the tenant moves in.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    name="status"
                    id="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate("/tenants")}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? "Creating..." : "Create Tenant"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTenant;
