import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "../components/Navigation";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

const NewTenantActivity = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [tenant, setTenant] = React.useState(null);
  const [formData, setFormData] = React.useState({
    type: "Electricity Bill",
    description: "",
    amount: "",
    date: new Date().toLocaleDateString("en-CA"),
    currentMeterReading: "",
  });
  const [error, setError] = React.useState("");

  // Fetch tenant details to get electricity multiplier and last meter reading
  React.useEffect(() => {
    const fetchTenant = async () => {
      try {
        const tenantRef = doc(db, "tenants", id);
        const tenantSnap = await getDoc(tenantRef);
        if (tenantSnap.exists()) {
          setTenant(tenantSnap.data());
        }
      } catch (error) {
        console.error("Error fetching tenant:", error);
      }
    };
    fetchTenant();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateElectricityBill = () => {
    if (!tenant || !formData.currentMeterReading) return 0;

    const currentReading = parseFloat(formData.currentMeterReading);
    const lastReading =
      tenant.lastMeterReading || tenant.startMonthMeterReading || 0;
    const multiplier = tenant.baseElectricityMultiplier || 7;

    const unitsUsed = currentReading - lastReading;
    return unitsUsed * multiplier;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let activityData = {
        ...formData,
        tenantId: id,
        userId: user.uid,
        date: formData.date,
        createdAt: serverTimestamp(),
      };

      // Handle different activity types
      switch (formData.type) {
        case "Payment":
          activityData.amount = parseFloat(formData.amount);
          break;
        case "Expense":
          activityData.amount = -parseFloat(formData.amount);
          break;
        case "Electricity Bill":
          const billAmount = calculateElectricityBill();
          activityData.amount = -billAmount;
          activityData.currentMeterReading = parseFloat(
            formData.currentMeterReading
          );
          // Store the previous meter reading in the activity record
          activityData.previousMeterReading =
            tenant.lastMeterReading || tenant.startMonthMeterReading || 0;
          activityData.baseElectricityMultiplier =
            tenant.baseElectricityMultiplier || 7;
          break;
        default:
          activityData.amount = formData.amount
            ? parseFloat(formData.amount)
            : null;
      }

      // Create activity in Firestore
      await addDoc(collection(db, "tenantActivities"), activityData);

      // If it's an electricity bill, update the tenant's last meter reading
      if (formData.type === "Electricity Bill") {
        const tenantRef = doc(db, "tenants", id);
        await updateDoc(tenantRef, {
          lastMeterReading: parseFloat(formData.currentMeterReading),
        });
      }

      // Reset form and redirect
      setFormData({
        type: "Electricity Bill",
        description: "",
        amount: "",
        date: new Date().toLocaleDateString("en-CA"),
        currentMeterReading: "",
      });

      navigate(`/tenants/${id}`);
    } catch (error) {
      console.error("Error creating activity:", error);
      setError("Failed to create activity. Please try again.");
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
            <h1 className="text-2xl font-bold text-gray-900">
              Record Activity
            </h1>
            <button
              onClick={() => navigate(`/tenants/${id}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Tenant
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
                    htmlFor="type"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Activity Type
                  </label>
                  <select
                    name="type"
                    id="type"
                    required
                    value={formData.type}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  >
                    <option value="Payment">Payment (Positive)</option>
                    <option value="Expense">Expense (Negative)</option>
                    <option value="Electricity Bill">Electricity Bill</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Complaint">Complaint</option>
                    <option value="Notice">Notice</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>

                {formData.type === "Electricity Bill" && (
                  <div>
                    <label
                      htmlFor="currentMeterReading"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Current Meter Reading
                    </label>
                    <input
                      type="number"
                      name="currentMeterReading"
                      id="currentMeterReading"
                      required
                      min="0"
                      step="0.01"
                      value={formData.currentMeterReading}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={loading}
                    />
                    {tenant && (
                      <p className="mt-1 text-sm text-gray-500">
                        Last reading:{" "}
                        {tenant.lastMeterReading ||
                          tenant.startMonthMeterReading ||
                          0}
                        <br />
                        Multiplier: {tenant.baseElectricityMultiplier || 7}
                        <br />
                        Date: {formatDate(formData.date)}
                        <br />
                        Estimated bill:{" "}
                        {formatCurrency(calculateElectricityBill())}
                      </p>
                    )}
                  </div>
                )}

                {(formData.type === "Payment" ||
                  formData.type === "Expense") && (
                  <div>
                    <label
                      htmlFor="amount"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Amount
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">₹</span>
                      </div>
                      <input
                        type="number"
                        name="amount"
                        id="amount"
                        required
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-7 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    id="date"
                    required
                    value={formData.date}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/tenants/${id}`)}
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
                    {loading ? "Recording..." : "Record Activity"}
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

export default NewTenantActivity;
