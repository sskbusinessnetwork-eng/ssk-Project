import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '        onClose={() => !isSubmitting && setIsModalOpen(false)}',
    '''        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setFormData({ participantId: '', date: '', time: '', venue: '', notes: '' });
            setLocationSelection('');
            setSearchTerm('');
            setIsDropdownOpen(false);
          }
        }}'''
)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
