import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "../components/Navigation";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

// Activity Modal Component
const ActivityModal = ({ activity, tenantPhone, onClose }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  const handleWhatsAppShare = () => {
    // Extract country code from phone number or use 91 as fallback
    const phoneNumber = tenantPhone || "";
    let countryCode = "91"; // Default to India's country code
    let cleanNumber = phoneNumber.replace(/[^0-9]/g, ""); // Remove all non-numeric characters

    // Try to extract country code from phone number
    if (phoneNumber) {
      // First try to find a country code with + prefix
      const plusMatch = phoneNumber.match(/^\+(\d{1,3})/);
      if (plusMatch) {
        countryCode = plusMatch[1];
        cleanNumber = cleanNumber.slice(countryCode.length);
      } else {
        // If no + prefix, check if the number starts with 91
        if (cleanNumber.startsWith("91")) {
          countryCode = "91";
          cleanNumber = cleanNumber.slice(2);
        }
      }
    }

    let message;
    if (activity.type === "Electricity Bill") {
      const units =
        activity.currentMeterReading - activity.previousMeterReading;
      message = `Your Electricity Bill for ${
        activity.description
      }\nDate: ${formatDate(activity.date)}\nPrevious Reading: ${
        activity.previousMeterReading
      }\nCurrent Reading: ${activity.currentMeterReading}\nBase multiplier: ${
        activity.baseElectricityMultiplier
      }\nTotal Amount: ${formatCurrency(Math.abs(activity.amount))}`;
    } else if (activity.type === "Payment") {
      message = `Thank you for your payment of ${formatCurrency(
        activity.amount
      )} for ${activity.description}.\nDate: ${formatDate(
        activity.date
      )}\n\nWe appreciate your timely payment.`;
    } else {
      message = `Activity Details:\nType: ${activity.type}\nDescription: ${
        activity.description
      }\nAmount: ${formatCurrency(activity.amount)}\nDate: ${formatDate(
        activity.date
      )}`;
    }

    // Format the phone number with country code
    const formattedNumber = `${countryCode}${cleanNumber}`;
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleSMSShare = () => {
    // Extract phone number without country code for SMS
    const phoneNumber = tenantPhone || "";
    let cleanNumber = phoneNumber.replace(/[^0-9]/g, ""); // Remove all non-numeric characters

    // Remove country code if present
    if (cleanNumber.startsWith("91")) {
      cleanNumber = cleanNumber.slice(2);
    }

    let message;
    if (activity.type === "Electricity Bill") {
      const units =
        activity.currentMeterReading - activity.previousMeterReading;
      message = `Your Electricity Bill for ${
        activity.description
      }\nDate: ${formatDate(activity.date)}\nPrevious Reading: ${
        activity.previousMeterReading
      }\nCurrent Reading: ${activity.currentMeterReading}\nBase multiplier: ${
        activity.baseElectricityMultiplier
      }\nTotal Amount: ${formatCurrency(Math.abs(activity.amount))}`;
    } else if (activity.type === "Payment") {
      message = `Thank you for your payment of ${formatCurrency(
        activity.amount
      )} for ${activity.description}.\nDate: ${formatDate(
        activity.date
      )}\n\nWe appreciate your timely payment.`;
    } else {
      message = `Activity Details:\nType: ${activity.type}\nDescription: ${
        activity.description
      }\nAmount: ${formatCurrency(activity.amount)}\nDate: ${formatDate(
        activity.date
      )}`;
    }

    // Open SMS intent
    const smsUrl = `sms:${cleanNumber}&body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  const renderElectricityBreakdown = () => {
    if (activity.type !== "Electricity Bill") return null;

    const units = activity.currentMeterReading - activity.previousMeterReading;
    const baseAmount = units * activity.baseElectricityMultiplier;
    const totalAmount = Math.abs(activity.amount);

    return (
      <div className="mt-4 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Electricity Bill Breakdown
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Previous Meter Reading:</span>
            <span className="text-gray-900">
              {activity.previousMeterReading}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Current Meter Reading:</span>
            <span className="text-gray-900">
              {activity.currentMeterReading}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Units Consumed:</span>
            <span className="text-gray-900">{units}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Rate per Unit:</span>
            <span className="text-gray-900">
              {formatCurrency(activity.baseElectricityMultiplier)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Base Amount:</span>
            <span className="text-gray-900">{formatCurrency(baseAmount)}</span>
          </div>
          {activity.additionalCharges > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Additional Charges:</span>
              <span className="text-gray-900">
                {formatCurrency(activity.additionalCharges)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-medium border-t pt-2">
            <span className="text-gray-900">Total Amount:</span>
            <span className="text-red-600">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[32rem] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Activity Details
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Type</p>
              <p className="text-base text-gray-900">{activity.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="text-base text-gray-900">{activity.description}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Amount</p>
              <p
                className={`text-base ${
                  activity.amount >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(activity.amount)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="text-base text-gray-900">
                {formatDate(activity.date)}
              </p>
            </div>
          </div>
          {renderElectricityBreakdown()}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={handleWhatsAppShare}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Share on WhatsApp
            </button>
            <button
              onClick={handleSMSShare}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Send SMS
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TenantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [tenant, setTenant] = React.useState(null);
  const [properties, setProperties] = React.useState([]);
  const [error, setError] = React.useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [activities, setActivities] = React.useState([]);
  const [selectedActivity, setSelectedActivity] = React.useState(null);
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

  // Check if rent needs to be recorded for the current month
  const checkAndRecordRent = React.useCallback(async () => {
    if (!tenant || tenant.status !== "Active") return;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Check if rent has already been recorded for this month
    const hasRentForCurrentMonth = activities.some((activity) => {
      if (
        activity.type !== "Expense" ||
        !activity.description.includes("Monthly Rent")
      )
        return false;
      const activityDate = new Date(activity.date);
      return (
        activityDate.getMonth() === currentMonth &&
        activityDate.getFullYear() === currentYear
      );
    });

    if (!hasRentForCurrentMonth) {
      try {
        const rentActivity = {
          type: "Expense",
          description: `Monthly Rent for ${today.toLocaleString("en-US", {
            month: "long",
            year: "numeric",
          })}`,
          amount: -tenant.rentAmount, // Negative amount to show it's owed
          date: today.toISOString().split("T")[0],
          tenantId: id,
          userId: user.uid,
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, "tenantActivities"), rentActivity);
      } catch (error) {
        console.error("Error recording monthly rent:", error);
        setError("Failed to record monthly rent. Please try again.");
      }
    }
  }, [tenant, activities, id, user.uid]);

  // Fetch tenant details, properties, and activities
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tenant details
        const tenantRef = doc(db, "tenants", id);
        const tenantSnap = await getDoc(tenantRef);

        if (tenantSnap.exists()) {
          const data = tenantSnap.data();
          // Check if the tenant belongs to the current user
          if (data.userId !== user.uid) {
            navigate("/tenants");
            return;
          }
          setTenant(data);
        } else {
          navigate("/tenants");
          return;
        }

        // Fetch properties for the dropdown
        const propertiesQuery = query(
          collection(db, "properties"),
          where("userId", "==", user.uid)
        );
        const propertiesSnapshot = await getDocs(propertiesQuery);
        const propertyList = propertiesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProperties(propertyList);

        // Fetch tenant activities
        const activitiesQuery = query(
          collection(db, "tenantActivities"),
          where("tenantId", "==", id),
          where("userId", "==", user.uid)
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activityList = activitiesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setActivities(activityList);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load tenant details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, navigate]);

  // Separate useEffect for rent check that only runs once when component mounts
  React.useEffect(() => {
    if (tenant && activities.length > 0) {
      checkAndRecordRent();
    }
  }, [tenant, activities, checkAndRecordRent]); // Add dependencies to run when these values change

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTenant((prev) => ({
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
      setTenant((prev) => ({
        ...prev,
        phone: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Get the property name for the tenant record
      const selectedProperty = properties.find(
        (p) => p.id === tenant.propertyId
      );

      // Format phone number with country code
      const formattedPhone = `+${countryCode} ${tenant.phone}`;

      const tenantRef = doc(db, "tenants", id);
      await updateDoc(tenantRef, {
        ...tenant,
        phone: formattedPhone,
        propertyName: selectedProperty?.name || "",
        rentAmount: parseFloat(tenant.rentAmount),
        updatedAt: serverTimestamp(),
      });
      setIsEditMode(false);
    } catch (error) {
      console.error("Error updating tenant:", error);
      setError("Failed to update tenant. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      // First, delete all tenant activities
      const activitiesQuery = query(
        collection(db, "tenantActivities"),
        where("tenantId", "==", id),
        where("userId", "==", user.uid)
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      const deletePromises = activitiesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Then delete the tenant
      const tenantRef = doc(db, "tenants", id);
      await deleteDoc(tenantRef);
      navigate("/tenants");
    } catch (error) {
      console.error("Error deleting tenant:", error);
      setError("Failed to delete tenant. Please try again.");
    }
  };

  // Calculate ledger balance
  const calculateLedgerBalance = () => {
    return activities.reduce((balance, activity) => {
      return balance + (activity.amount || 0);
    }, 0);
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

  // Format date with time
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  // Format date without time
  const formatDateOnly = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Tenant Details</h1>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsEditMode(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit Tenant
              </button>
              <button
                onClick={() => navigate(`/tenants/${id}/activity/new`)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Record Activity
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {isEditMode ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
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
                      value={tenant.name}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={saving}
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
                      value={tenant.email}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={saving}
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
                        value={tenant.phone}
                        onChange={handlePhoneChange}
                        placeholder="Enter 10-digit number"
                        maxLength="10"
                        pattern="[0-9]{10}"
                        className="flex-1 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        disabled={saving}
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
                      value={tenant.propertyId}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={saving}
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
                      value={tenant.unitNumber}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={saving}
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
                        value={tenant.leaseStart}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={saving}
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
                        value={tenant.leaseEnd}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={saving}
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
                        value={tenant.rentAmount}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-7 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={saving}
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
                        value={tenant.baseElectricityMultiplier || "7"}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={saving}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      This multiplier will be used to calculate electricity
                      charges.
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
                        value={tenant.startMonthMeterReading || ""}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={saving}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      The initial meter reading when the tenant moved in.
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
                      value={tenant.status}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={saving}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      disabled={saving}
                    >
                      Delete Tenant
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        saving ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Tenant Information
                    </h3>
                    <dl className="mt-4 space-y-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Email
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {tenant.email || "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Phone
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {tenant.phone || "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Property
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {tenant.propertyName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Unit Number
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {tenant.unitNumber}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Lease Period
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDateOnly(tenant.leaseStart)} -{" "}
                          {formatDateOnly(tenant.leaseEnd)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Monthly Rent
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatCurrency(tenant.rentAmount)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Status
                        </dt>
                        <dd className="mt-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tenant.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : tenant.status === "Inactive"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {tenant.status}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Electricity Information
                    </h3>
                    <dl className="mt-4 space-y-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Base Electricity Multiplier
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {tenant.baseElectricityMultiplier}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Start Month Meter Reading
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {tenant.startMonthMeterReading}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Recent Activities
                    </h3>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Current Balance</p>
                      <p
                        className={`text-lg font-semibold ${
                          calculateLedgerBalance() >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(calculateLedgerBalance())}
                      </p>
                    </div>
                  </div>
                  {activities.length === 0 ? (
                    <p className="mt-4 text-sm text-gray-500">
                      No activities recorded yet.
                    </p>
                  ) : (
                    <div className="mt-4 flow-root">
                      <ul className="-mb-8">
                        {activities
                          .sort((a, b) => {
                            // Sort by createdAt timestamp if available, otherwise fallback to date
                            const dateA =
                              a.createdAt?.toDate?.() || new Date(a.date);
                            const dateB =
                              b.createdAt?.toDate?.() || new Date(b.date);
                            return dateB - dateA;
                          })
                          .map((activity, index) => (
                            <li key={activity.id}>
                              <div
                                className="relative pb-8 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors duration-200"
                                onClick={() => setSelectedActivity(activity)}
                              >
                                {index !== activities.length - 1 && (
                                  <span
                                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                    aria-hidden="true"
                                  />
                                )}
                                <div className="relative flex space-x-3">
                                  <div>
                                    <span
                                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                        activity.type === "Payment"
                                          ? "bg-green-500"
                                          : activity.type === "Electricity Bill"
                                          ? "bg-yellow-500"
                                          : activity.type === "Expense"
                                          ? "bg-red-500"
                                          : "bg-indigo-500"
                                      }`}
                                    >
                                      <span className="text-white text-sm">
                                        {activity.type.charAt(0)}
                                      </span>
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        {activity.description}
                                        <span className="font-medium text-gray-900">
                                          {" "}
                                          {activity.type}
                                        </span>
                                      </p>
                                      {activity.type === "Electricity Bill" && (
                                        <p className="text-sm text-gray-500">
                                          Meter Reading:{" "}
                                          {activity.currentMeterReading}
                                        </p>
                                      )}
                                      <p className="mt-0.5 text-sm text-gray-500">
                                        {activity.createdAt?.toDate
                                          ? formatDate(
                                              activity.createdAt.toDate()
                                            )
                                          : formatDate(activity.date)}
                                      </p>
                                    </div>
                                    {activity.amount !== undefined && (
                                      <div
                                        className={`text-right text-sm font-medium ${
                                          activity.amount >= 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        {formatCurrency(activity.amount)}
                                      </div>
                                    )}
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
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delete Tenant
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this tenant? This action cannot be
              undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {selectedActivity && (
        <ActivityModal
          activity={selectedActivity}
          tenantPhone={tenant.phone}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
};

export default TenantDetails;
