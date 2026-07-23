import re

with open('src/pages/Login.tsx', 'r') as f:
    content = f.read()

# Remove state variables for forgot password
content = re.sub(r"const \[mode, setMode\] = React\.useState<'login' \| 'forgot'>\('login'\);\n", "", content)
content = re.sub(r"const \[forgotStep, setForgotStep\] = React\.useState<'identifier' \| 'otp' \| 'reset'>\('identifier'\);\n", "", content)
content = re.sub(r"const \[confirmationResult, setConfirmationResult\] = React\.useState<any \| null>\(null\);\n", "", content)
content = re.sub(r"const \[resetToken, setResetToken\] = React\.useState<string \| null>\(null\);\n", "", content)

# Remove flow flags
content = re.sub(r"const isLoginFlow = mode === 'login';\n", "", content)
content = re.sub(r"const isForgotPasswordFlow = mode === 'forgot';\n", "", content)
content = re.sub(r"const isResetStep = forgotStep === 'reset';\n", "", content)

# Remove form data for otp and newPassword
content = re.sub(r"\s*otp: '',\n\s*newPassword: '',\n\s*confirmPassword: ''", "", content)

# Replace 'Mobile number not registered.' and 'Incorrect password.' with 'Invalid phone number or password.'
content = content.replace("throw new Error(\"Incorrect password.\");", "throw new Error('Invalid phone number or password.');")
content = content.replace("throw new Error(\"Mobile number not registered.\");", "throw new Error('Invalid phone number or password.');")

# Remove handleSendOTP to end of handleQuickLogin
handle_send_otp_start = content.find("const handleSendOTP = async (e: React.FormEvent) => {")
return_start = content.find("return (", handle_send_otp_start)
if handle_send_otp_start != -1 and return_start != -1:
    content = content[:handle_send_otp_start] + content[return_start:]

# Remove AnimatePresence and mode checks for forgot password in JSX
# We will just manually trim out the forgot password section
forgot_section_start = content.find("{mode === 'login' ? (")
if forgot_section_start != -1:
    content = content.replace("{mode === 'login' ? (", "")
    
    # We need to find where the login form ends and the forgot form starts
    forgot_form_pattern = r"\)\s*:\s*\(\s*<motion\.div\s*key=\"forgot\"[\s\S]*?BACK TO SECURITY PORTAL\s*</button>\s*</motion\.div>\s*\)"
    content = re.sub(forgot_form_pattern, "", content)

# Remove the "Forgot Security Key?" button
forgot_button_pattern = r"<div className=\"flex justify-end pt-1\">\s*<button\s*type=\"button\"\s*onClick=\{[\s\S]*?className=\"text-\[9px\] font-black text-primary uppercase tracking-\[0\.2em\] hover:underline hover:opacity-90\"\s*>\s*FORGOT SECURITY KEY\?\s*</button>\s*</div>"
content = re.sub(forgot_button_pattern, "", content)

with open('src/pages/Login.tsx', 'w') as f:
    f.write(content)
