import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Search, Tags, Edit2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { Category } from '../types';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabaseClient';

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Subscribe to virtualized Categories list
  useEffect(() => {
    const unsubscribe = databaseService.subscribe<Category>('categories', [], setCategories);
    return () => unsubscribe();
  }, []);

  // Subscribe to Users table to count category members reactively
  useEffect(() => {
    const unsubscribeUsers = databaseService.subscribe<any>('users', [], setUsers);
    return () => unsubscribeUsers();
  }, []);

  // Compute Total Members assigned to each Category name
  const categoryMemberCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(user => {
      if (user.category) {
        const catName = user.category.trim();
        counts[catName] = (counts[catName] || 0) + 1;
      }
    });
    return counts;
  }, [users]);

  const handleOpenModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryName(cat.name);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = categoryName.trim();
    if (!cleanName) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Enforce Unique Category Names (case-insensitive check)
      const duplicate = categories.find(c => 
        c.name.toLowerCase() === cleanName.toLowerCase() && 
        (!editingCategory || c.id !== editingCategory.id)
      );

      if (duplicate) {
        throw new Error(`Category name "${cleanName}" already exists. Please choose a unique name.`);
      }

      const nowStr = new Date().toISOString();

      if (editingCategory) {
        const oldName = editingCategory.name.trim();

        // Update the category itself
        await databaseService.update('categories', editingCategory.id, { 
          name: cleanName,
          updatedAt: nowStr
        });

        // "If the Master Admin updates a category name, it must automatically update everywhere it is used."
        if (oldName.toLowerCase() !== cleanName.toLowerCase()) {
          const { error: updateErr } = await supabase
            .from('users')
            .update({ category: cleanName })
            .eq('category', oldName);

          if (updateErr) {
            console.error("Failed to propagate category rename to members:", updateErr);
          }
        }

        setSuccess('Category updated successfully and propagated to members!');
      } else {
        await databaseService.create('categories', { 
          name: cleanName,
          status: 'Active',
          createdAt: nowStr,
          updatedAt: nowStr
        });
        setSuccess('Category created successfully!');
      }

      setCategoryName('');
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    // "Prevent deleting a category that is assigned to one or more members."
    const assignedCount = categoryMemberCounts[cat.name.trim()] || 0;
    if (assignedCount > 0) {
      alert(`Cannot delete category "${cat.name}" because it is currently assigned to ${assignedCount} member(s). Please reassign or remove these members first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the category "${cat.name}"?`)) return;

    try {
      await databaseService.delete('categories', cat.id);
      setSuccess('Category deleted successfully!');
      setTimeout(() => setSuccess(null), 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const toggleStatus = async (cat: Category) => {
    const currentStatus = (cat as any).status || 'Active';
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await databaseService.update('categories', cat.id, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update category status');
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#111827] tracking-tight">Business Categories</h1>
          <p className="text-[#6B7280] mt-1 font-sans text-sm">Manage global list, statuses, member assignments, and name synchronizations.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-[12px] font-semibold hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
        >
          <Plus size={20} />
          <span>Add Category</span>
        </button>
      </header>

      <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F3F4F6] bg-[#F9FAFB]/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E7EB] focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]/50 text-[#374151] text-xs font-semibold uppercase tracking-wider">
                <th className="p-4 pl-6">Category Name</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Total Members</th>
                <th className="p-4">Created Date</th>
                <th className="p-4">Last Updated</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-sm">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => {
                  const status = (cat as any).status || 'Active';
                  const count = categoryMemberCounts[cat.name.trim()] || 0;
                  const createdDate = (cat as any).createdAt 
                    ? new Date((cat as any).createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'System Default';
                  const updatedDate = (cat as any).updatedAt
                    ? new Date((cat as any).updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : createdDate;

                  return (
                    <tr key={cat.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="p-4 pl-6 font-medium text-[#111827]">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                            <Tags size={16} />
                          </div>
                          <span>{cat.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                            {status}
                          </span>
                          <button
                            onClick={() => toggleStatus(cat)}
                            className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold cursor-pointer"
                          >
                            {status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full ${count > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                          {count} {count === 1 ? 'member' : 'members'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 text-xs font-mono">{createdDate}</td>
                      <td className="p-4 text-gray-500 text-xs font-mono">{updatedDate}</td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(cat)}
                            title="Edit category"
                            className="p-2 text-[#9CA3AF] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            title="Delete category"
                            className="p-2 text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-[#9CA3AF]">
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setError(null);
            setSuccess(null);
          }
        }}
        title={editingCategory ? "Edit Category" : "Add New Category"}
      >
        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-[#111827] font-bold text-lg">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-[12px] text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">Category Name</label>
              <input
                autoFocus
                required
                type="text"
                disabled={isSubmitting}
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Real Estate, Digital Marketing"
                className="w-full px-4 py-3 rounded-[12px] border border-[#E5E7EB] focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-600 text-white rounded-[12px] font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingCategory ? "Update Category" : "Create Category")}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
