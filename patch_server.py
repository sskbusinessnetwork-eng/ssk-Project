import re
with open('server.ts', 'r') as f:
    content = f.read()

new_endpoint = """
  app.post("/api/users/update", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: "Invalid token" });

      const { uid, updates } = req.body;
      
      if (user.id !== uid) {
        const personalFields = ['name', 'email', 'phone', 'whatsapp_number', 'profile_photo', 'business_name', 'businessName', 'address', 'bio', 'photoURL', 'category', 'state', 'city', 'area', 'pincode', 'website', 'professionDesignation', 'profession_designation'];
        const hasPersonalFields = Object.keys(updates).some(k => personalFields.includes(k));
        
        if (hasPersonalFields) {
          return res.status(403).json({ error: "You can only edit your own profile." });
        }
      }

      const { error: updateError } = await supabase.from('users').update(updates).eq('id', uid);
      if (updateError) throw updateError;
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
"""

if "/api/users/update" not in content:
    content = content.replace('app.post("/api/admin/update-user"', new_endpoint + '\n  app.post("/api/admin/update-user"')

with open('server.ts', 'w') as f:
    f.write(content)
