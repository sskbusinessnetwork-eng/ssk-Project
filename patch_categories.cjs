const fs = require('fs');
const file = 'src/pages/Categories.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace databaseService imports if necessary, but we also use it for 'users'.
// We'll leave the import and use supabase directly for categories.

// Find the useEffect for categories
const fetchCategoriesCode = `
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('category_name', { ascending: true });
        
      if (error) throw error;
      
      // Map 'category_name' to 'name' for the UI, or just use as is
      const formatted = (data || []).map(c => ({
        ...c,
        name: c.category_name || c.name, // fallback
      }));
      setCategories(formatted);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);
`;

content = content.replace(
  `  // Subscribe to virtualized Categories list
  useEffect(() => {
    const unsubscribe = databaseService.subscribe<Category>('categories', [], setCategories);
    return () => unsubscribe();
  }, []);`,
  fetchCategoriesCode
);

// Replace handleSubmit
const oldHandleSubmit = `  const handleSubmit = async (e: React.FormEvent) => {
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
        throw new Error(\`Category name "\${cleanName}" already exists. Please choose a unique name.\`);
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
  };`;

const newHandleSubmit = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = categoryName.trim();
    if (!cleanName) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Enforce Unique Category Names (case-insensitive check)
      const duplicate = categories.find(c => 
        (c.category_name || c.name || '').toLowerCase() === cleanName.toLowerCase() && 
        (!editingCategory || c.id !== editingCategory.id)
      );

      if (duplicate) {
        throw new Error('Category name already exists.');
      }

      const nowStr = new Date().toISOString();

      if (editingCategory) {
        const oldName = editingCategory.name?.trim();
        
        const { error: updateError } = await supabase
          .from('categories')
          .update({ 
            category_name: cleanName,
            updated_at: nowStr
          })
          .eq('id', editingCategory.id);

        if (updateError) throw updateError;
        
        if (oldName && oldName.toLowerCase() !== cleanName.toLowerCase()) {
          const { error: updateErr } = await supabase
            .from('users')
            .update({ category: cleanName })
            .eq('category', oldName);
            
          if (updateErr) {
            console.error("Failed to propagate category rename to members:", updateErr);
          }
        }
        
        setSuccess('Category updated successfully.');
      } else {
        const { error: insertError } = await supabase
          .from('categories')
          .insert([{ 
            category_name: cleanName,
            status: 'Active'
          }]);
          
        if (insertError) throw insertError;
        
        setSuccess('Category added successfully.');
      }

      setCategoryName('');
      await fetchCategories(); // Refresh immediately
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save category.');
    } finally {
      setIsSubmitting(false);
    }
  };`;

content = content.replace(oldHandleSubmit, newHandleSubmit);

// Replace handleDelete
const oldHandleDelete = `  const handleDelete = async (cat: Category) => {
    // "Prevent deleting a category that is assigned to one or more members."
    const assignedCount = categoryMemberCounts[cat.name.trim()] || 0;
    if (assignedCount > 0) {
      alert(\`Cannot delete category "\${cat.name}" because it is currently assigned to \${assignedCount} member(s). Please reassign or remove these members first.\`);
      return;
    }

    if (!window.confirm(\`Are you sure you want to delete the category "\${cat.name}"?\`)) return;

    try {
      await databaseService.delete('categories', cat.id);
      setSuccess('Category deleted successfully!');
      setTimeout(() => setSuccess(null), 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };`;

const newHandleDelete = `  const handleDelete = async (cat: Category) => {
    // "Prevent deleting a category that is assigned to one or more members."
    const assignedCount = categoryMemberCounts[cat.name.trim()] || 0;
    if (assignedCount > 0) {
      alert(\`Cannot delete category "\${cat.name}" because it is currently assigned to \${assignedCount} member(s). Please reassign or remove these members first.\`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', cat.id);

      if (deleteError) throw deleteError;

      setSuccess('Category deleted successfully.');
      await fetchCategories();
      setTimeout(() => setSuccess(null), 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category.');
    }
  };`;

content = content.replace(oldHandleDelete, newHandleDelete);

// Replace toggleStatus just in case, to use Supabase as well
const oldToggleStatus = `  const toggleStatus = async (cat: Category) => {
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
  };`;

const newToggleStatus = `  const toggleStatus = async (cat: Category) => {
    const currentStatus = (cat as any).status || 'Active';
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    try {
      const { error } = await supabase
        .from('categories')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', cat.id);

      if (error) throw error;
      await fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to update category status.');
    }
  };`;

content = content.replace(oldToggleStatus, newToggleStatus);

fs.writeFileSync(file, content);
console.log("Categories patched.");
