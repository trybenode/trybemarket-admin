"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import { getAllPlans, togglePlanStatus, deletePlan, getPlanStats } from "@/utils/plans";
import EditPlanModal from "@/components/EditPlanModal";
import AddPlanModal from "@/components/AddPlanModal";

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byCategory: {},
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchPlansData();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, plans]);

  const fetchPlansData = async () => {
    try {
      setLoading(true);
      const [plansData, statsData] = await Promise.all([
        getAllPlans(),
        getPlanStats(),
      ]);
      setPlans(plansData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filter === "all") {
      setFilteredPlans(plans);
    } else if (filter === "active") {
      setFilteredPlans(plans.filter((plan) => plan.active));
    } else if (filter === "inactive") {
      setFilteredPlans(plans.filter((plan) => !plan.active));
    } else {
      // Category filter
      setFilteredPlans(plans.filter((plan) => plan.category === filter));
    }
  };

  const handleToggleStatus = async (planId, currentStatus) => {
    try {
      await togglePlanStatus(planId, !currentStatus);
      await fetchPlansData();
    } catch (error) {
      console.error("Error toggling plan status:", error);
      alert("Failed to update plan status");
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    
    try {
      await deletePlan(planId);
      await fetchPlansData();
    } catch (error) {
      console.error("Error deleting plan:", error);
      alert("Failed to delete plan");
    }
  };

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    setIsEditModalOpen(true);
  };

  const handleAddPlan = () => {
    setIsAddModalOpen(true);
  };

  const formatPrice = (pricing) => {
    if (!pricing) return "N/A";
    if (pricing.free) return "Free";
    
    const prices = [];
    if (pricing.monthly) prices.push(`₦${pricing.monthly}/mo`);
    if (pricing.yearly) prices.push(`₦${pricing.yearly}/yr`);
    
    return prices.join(" or ");
  };

  const getCategoryBadge = (category) => {
    const colors = {
      product: "bg-blue-500/20 text-blue-400",
      service: "bg-green-500/20 text-green-400",
      bundle: "bg-purple-500/20 text-purple-400",
      boost: "bg-yellow-500/20 text-yellow-400",
      discount: "bg-pink-500/20 text-pink-400",
    };
    
    return colors[category] || "bg-gray-500/20 text-gray-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <PageHeader title="Subscription Plans" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading plans...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <PageHeader title="Subscription Plans" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Total Plans</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Active Plans</div>
            <div className="text-3xl font-bold text-green-400">{stats.active}</div>
          </div>
          
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Product Plans</div>
            <div className="text-3xl font-bold text-blue-400">{stats.byCategory.product || 0}</div>
          </div>
          
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Service Plans</div>
            <div className="text-3xl font-bold text-green-400">{stats.byCategory.service || 0}</div>
          </div>
          
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Bundle Plans</div>
            <div className="text-3xl font-bold text-purple-400">{stats.byCategory.bundle || 0}</div>
          </div>
        </div>

        {/* Filters and Add Button */}
        <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
            >
              All Plans
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "active"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter("inactive")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "inactive"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
            >
              Inactive
            </button>
            <button
              onClick={() => setFilter("product")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "product"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setFilter("service")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "service"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setFilter("bundle")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "bundle"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
            >
              Bundles
            </button>
          </div>
          
          <button
            onClick={handleAddPlan}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            + Add Plan
          </button>
        </div>

        {/* Plans Table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800/50 border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Plan Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Features
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                      No plans found
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                            <span className="text-indigo-400 text-lg font-bold">
                              {plan.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="text-white font-medium">{plan.name}</div>
                            <div className="text-gray-400 text-sm">{plan.description || "No description"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryBadge(plan.category)}`}>
                          {plan.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {plan.type || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {formatPrice(plan.pricing)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400 text-sm">
                          {plan.features?.length || 0} features
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(plan.id, plan.active)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            plan.active
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {plan.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPlan(plan)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isEditModalOpen && (
        <EditPlanModal
          plan={selectedPlan}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedPlan(null);
          }}
          onSave={() => {
            setIsEditModalOpen(false);
            setSelectedPlan(null);
            fetchPlansData();
          }}
        />
      )}

      {isAddModalOpen && (
        <AddPlanModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={() => {
            setIsAddModalOpen(false);
            fetchPlansData();
          }}
        />
      )}
    </div>
  );
}