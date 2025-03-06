import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [properties, setProperties] = React.useState([]);
  const [tenants, setTenants] = React.useState([]);
  const [activities, setActivities] = React.useState([]);
  const [recentActivities, setRecentActivities] = React.useState([]);

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
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  React.useEffect(() => {
    if (!user) {
      console.log("No user found, returning");
      return;
    }

    console.log("Setting up listeners for user:", user.uid);
    setLoading(true);

    let loadedCount = 0;
    const totalListeners = 3;

    const setLoaded = () => {
      loadedCount++;
      console.log(`Listener loaded: ${loadedCount}/${totalListeners}`);
      if (loadedCount === totalListeners) {
        console.log("All listeners loaded, setting loading to false");
        setLoading(false);
      }
    };

    // Set up listeners for properties, tenants, and activities
    const propertiesQuery = query(
      collection(db, "properties"),
      where("userId", "==", user.uid)
    );
    const tenantsQuery = query(
      collection(db, "tenants"),
      where("userId", "==", user.uid)
    );

    // Calculate date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Set up activities query with time limit and ordering
    const activitiesQuery = query(
      collection(db, "tenantActivities"),
      where("userId", "==", user.uid),
      where("date", ">=", sixMonthsAgo.toISOString().split("T")[0]),
      orderBy("date", "desc"),
      limit(100) // Limit to 100 most recent activities
    );

    console.log("Setting up properties listener");
    const unsubscribeProperties = onSnapshot(
      propertiesQuery,
      (snapshot) => {
        console.log("Properties loaded:", snapshot.size, "documents");
        const propertyList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProperties(propertyList);
        setLoaded();
      },
      (error) => {
        console.error("Error loading properties:", error);
        setLoaded(); // Still mark as loaded even if there's an error
      }
    );

    console.log("Setting up tenants listener");
    const unsubscribeTenants = onSnapshot(
      tenantsQuery,
      (snapshot) => {
        console.log("Tenants loaded:", snapshot.size, "documents");
        const tenantList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTenants(tenantList);
        setLoaded();
      },
      (error) => {
        console.error("Error loading tenants:", error);
        setLoaded(); // Still mark as loaded even if there's an error
      }
    );

    console.log("Setting up activities listener");
    const unsubscribeActivities = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        console.log("Activities loaded:", snapshot.size, "documents");
        const activityList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Store all activities for total calculation
        setActivities(activityList);
        // Sort activities by timestamp, then take latest 10
        const sortedActivities = activityList.sort((a, b) => {
          // Sort by createdAt timestamp if available, otherwise fallback to date
          const dateA = a.createdAt?.toDate?.() || new Date(a.date);
          const dateB = b.createdAt?.toDate?.() || new Date(b.date);
          return dateB - dateA;
        });
        setRecentActivities(sortedActivities.slice(0, 10));
        setLoaded();
      },
      (error) => {
        console.error("Error loading activities:", error);
        setLoaded();
      }
    );

    // Cleanup function
    return () => {
      console.log("Cleaning up listeners");
      unsubscribeProperties();
      unsubscribeTenants();
      unsubscribeActivities();
    };
  }, [user]);

  // Add a timeout to force loading to false after 10 seconds (safety measure)
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      console.log("Loading timeout reached, forcing loading to false");
      setLoading(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

  // Calculate total amount owed (negative balance) - optimized to process activities once
  const calculateTotalAmountOwed = () => {
    // Create a map of tenant balances
    const tenantBalances = new Map();

    // Calculate date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Process all activities once, but only from last 6 months
    activities.forEach((activity) => {
      const activityDate = new Date(activity.date);
      if (activityDate >= sixMonthsAgo) {
        const currentBalance = tenantBalances.get(activity.tenantId) || 0;
        tenantBalances.set(
          activity.tenantId,
          currentBalance + (activity.amount || 0)
        );
      }
    });

    // Sum up negative balances from active tenants only
    return tenants
      .filter((tenant) => tenant.status === "Active")
      .reduce((total, tenant) => {
        const balance = tenantBalances.get(tenant.id) || 0;
        return total + (balance < 0 ? Math.abs(balance) : 0);
      }, 0);
  };

  // Get active tenants count
  const activeTenantsCount = tenants.filter(
    (tenant) => tenant.status === "Active"
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Properties */}
          <div
            className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => navigate("/properties")}
          >
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Total Properties
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {properties.length}
              </dd>
            </div>
          </div>

          {/* Active Tenants */}
          <div
            className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => navigate("/tenants")}
          >
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Active Tenants
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {activeTenantsCount}
              </dd>
            </div>
          </div>

          {/* Total Amount Owed */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Amount Owed
                </dt>
                <div className="relative group">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    Last 6 months
                  </span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      Amount owed by active tenants from the last 6 months of
                      activities
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
              <dd className="mt-1 text-3xl font-semibold text-red-600">
                {formatCurrency(calculateTotalAmountOwed())}
              </dd>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Recent Activities
              </h3>
              {recentActivities.length === 0 ? (
                <p className="text-sm text-gray-500">No recent activities</p>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {recentActivities.map((activity, index) => {
                      const tenant = tenants.find(
                        (t) => t.id === activity.tenantId
                      );
                      return (
                        <li key={activity.id}>
                          <div className="relative pb-8">
                            {index !== recentActivities.length - 1 && (
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
                                    {tenant?.name || "Unknown Tenant"} -{" "}
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
                                      ? formatDate(activity.createdAt.toDate())
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
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
