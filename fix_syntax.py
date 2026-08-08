import re

with open('src/pages/ThankYouSlips.tsx', 'r') as f:
    content = f.read()

# I want to find <WriteTestimonialModal and remove it if it has an orphan )}
content = re.sub(r'<WriteTestimonialModal\s*isOpen={showWriteModal}\s*onClose={\(\) => setShowWriteModal\(false\)}\s*author={profile}\s*receiver={testimonialReceiver}\s*/>\s*\)}', 
r'''{testimonialReceiver && (
  <WriteTestimonialModal
    isOpen={showWriteModal}
    onClose={() => setShowWriteModal(false)}
    author={profile}
    receiver={testimonialReceiver}
  />
)}''', content)

with open('src/pages/ThankYouSlips.tsx', 'w') as f:
    f.write(content)

print("SUCCESS")
