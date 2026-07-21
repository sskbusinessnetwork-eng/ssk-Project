import re
with open('src/pages/Profile.tsx', 'r') as f:
    content = f.read()

old_catch = """    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMessage("Failed to update profile. Please try again.");
      setTimeout(() => setErrorMessage(null), 5000);"""

new_catch = """    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error.message === "You can only edit your own profile.") {
        setErrorMessage("You can only edit your own profile.");
      } else {
        setErrorMessage("Failed to update profile. Please try again.");
      }
      setTimeout(() => setErrorMessage(null), 5000);"""

content = content.replace(old_catch, new_catch)

with open('src/pages/Profile.tsx', 'w') as f:
    f.write(content)
