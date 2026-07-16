import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Search, Tags, Edit2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { Category } from '../types';
import { Modal } from '../components/Modal';

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = firestoreService.subscribe<Category>('categories', [], setCategories);
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryName(cat.name);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingCategory) {
        await firestoreService.update('categories', editingCategory.id, { name: categoryName.trim() });
        setSuccess('Category updated successfully!');
      } else {
        await firestoreService.create('categories', { name: categoryName.trim() });
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await firestoreService.delete('categories', id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const toggleStatus = async (cat: Category) => {
    const currentStatus = (cat as any).status || 'Active';
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await firestoreService.update('categories', cat.id, { status: newStatus });
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
          <p className="text-[#6B7280] mt-1">Manage the global list of business categories.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-[12px] font-semibold hover:bg-emerald-700 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-emerald-500/20"
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
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E5E7EB] focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                      <Tags size={16} />
                    </div>
                    <div>
                      <span className="font-medium text-[#374151] block">{cat.name}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${((cat as any).status || 'Active') === 'Active' ? 'text-emerald-600' : 'text-[#9CA3AF]'}`}>
                        {((cat as any).status || 'Active')}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleStatus(cat)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full transition-all border ${
                      ((cat as any).status || 'Active') === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-[#F9FAFB] text-[#4B5563] border-[#E5E7EB] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {((cat as any).status || 'Active') === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenModal(cat)}
                    className="p-2 text-[#9CA3AF] hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-[#9CA3AF]">
              No categories found.
            </div>
          )}
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
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-navy font-bold">{success}</p>
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
              <label className="text-sm font-bold text-[#374151] uppercase tracking-wider">Category Name</label>
              <input
                autoFocus
                required
                type="text"
                disabled={isSubmitting}
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Real Estate, Digital Marketing"
                className="w-full px-4 py-3 rounded-[12px] border border-[#E5E7EB] focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-600 text-white rounded-[12px] font-bold hover:bg-emerald-700 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingCategory ? "Update Category" : "Create Category")}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
