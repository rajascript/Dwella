import { collection, onSnapshot, query, where } from "firebase/firestore";
import React from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

const Tenants = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tenants, setTenants] = React.useState([]);
  const [activities, setActivities] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [expandedProperties, setExpandedProperties] = React.useState({});
  const [sortBy, setSortBy] = React.useState("name"); // name, balance, status
  const [sortOrder, setSortOrder] = React.useState("asc"); // asc, desc

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate tenant balance
  const calculateTenantBalance = (tenantId) => {
    return activities
      .filter((activity) => activity.tenantId === tenantId)
      .reduce((balance, activity) => balance + (activity.amount || 0), 0);
  };

  // Sort tenants based on selected criteria
  const sortTenants = (tenantsList) => {
    return [...tenantsList].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "balance":
          const balanceA = calculateTenantBalance(a.id);
          const balanceB = calculateTenantBalance(b.id);
          comparison = balanceA - balanceB;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  React.useEffect(() => {
    if (!user) return;

    let loadedCount = 0;
    const totalListeners = 2;

    const setLoaded = () => {
      loadedCount++;
      if (loadedCount === totalListeners) {
        setLoading(false);
      }
    };

    // Create a query to fetch tenants for the current user
    const tenantsQuery = query(
      collection(db, "tenants"),
      where("userId", "==", user.uid)
    );

    // Create a query to fetch activities for the current user
    const activitiesQuery = query(
      collection(db, "tenantActivities"),
      where("userId", "==", user.uid)
    );

    // Set up real-time listeners
    const unsubscribeTenants = onSnapshot(
      tenantsQuery,
      (snapshot) => {
        const tenantList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTenants(tenantList);
        // Initialize expandedProperties with all properties expanded
        const initialExpanded = {};
        tenantList.forEach((tenant) => {
          const propertyName = tenant.propertyName || "Unassigned";
          initialExpanded[propertyName] = true;
        });
        setExpandedProperties(initialExpanded);
        setLoaded();
      },
      (error) => {
        console.error("Error fetching tenants:", error);
        setLoaded();
      }
    );

    const unsubscribeActivities = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const activityList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setActivities(activityList);
        setLoaded();
      },
      (error) => {
        console.error("Error fetching activities:", error);
        setLoaded();
      }
    );

    // Cleanup subscriptions
    return () => {
      unsubscribeTenants();
      unsubscribeActivities();
    };
  }, [user]);

  // Filter and sort tenants based on search term and sort criteria
  const filteredTenants = React.useMemo(() => {
    let filtered = tenants;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = tenants.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(term) ||
          tenant.email?.toLowerCase().includes(term) ||
          tenant.phone?.toLowerCase().includes(term) ||
          tenant.propertyName?.toLowerCase().includes(term)
      );
    }
    return sortTenants(filtered);
  }, [tenants, searchTerm, sortBy, sortOrder]);

  // Group tenants by property
  const groupedTenants = React.useMemo(() => {
    const groups = {};
    filteredTenants.forEach((tenant) => {
      const propertyName = tenant.propertyName || "Unassigned";
      if (!groups[propertyName]) {
        groups[propertyName] = [];
      }
      groups[propertyName].push(tenant);
    });
    return groups;
  }, [filteredTenants]);

  const handleTenantClick = (tenantId) => {
    navigate(`/tenants/${tenantId}`);
  };

  const toggleProperty = (propertyName) => {
    setExpandedProperties((prev) => ({
      ...prev,
      [propertyName]: !prev[propertyName],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
            <button
              onClick={() => navigate("/tenants/new")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Tenant
            </button>
          </div>

          {/* Search and Sort Controls */}
          <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="balance">Sort by Balance</option>
                <option value="status">Sort by Status</option>
              </select>
              <button
                onClick={() =>
                  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap"
              >
                {sortOrder === "asc" ? "Ascending" : "Descending"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "No tenants found matching your search"
                  : "No tenants found"}
              </p>
              <button
                onClick={() => navigate("/tenants/new")}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Your First Tenant
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTenants).map(
                ([propertyName, propertyTenants]) => (
                  <div
                    key={propertyName}
                    className="bg-white shadow rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleProperty(propertyName)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 focus:outline-none"
                    >
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                          {propertyName}
                        </h3>
                        <span className="ml-2 px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {propertyTenants.length} tenant
                          {propertyTenants.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <svg
                        className={`h-5 w-5 text-gray-500 transform transition-transform ${
                          expandedProperties[propertyName] ? "rotate-180" : ""
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {expandedProperties[propertyName] && (
                      <ul className="divide-y divide-gray-200">
                        {propertyTenants.map((tenant) => {
                          const balance = calculateTenantBalance(tenant.id);
                          return (
                            <li key={tenant.id}>
                              <div
                                onClick={() => handleTenantClick(tenant.id)}
                                className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <span className="text-indigo-600 text-lg font-semibold">
                                          {tenant.name.charAt(0)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <h3 className="text-lg font-medium text-gray-900">
                                        {tenant.name}
                                      </h3>
                                      <p className="text-sm text-gray-500">
                                        {tenant.email} • {tenant.phone}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto">
                                    <div className="text-sm text-gray-500">
                                      {propertyName} - Unit {tenant.unitNumber}
                                    </div>
                                    <div className="relative group">
                                      <div
                                        className={`text-sm font-medium ${
                                          balance >= 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        {formatCurrency(balance)}
                                      </div>
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                        {balance >= 0
                                          ? "Tenant has paid extra"
                                          : "Amount owed by tenant"}
                                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                                      </div>
                                    </div>
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
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tenants;
