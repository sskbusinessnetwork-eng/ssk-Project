import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

# 1. Update locationOptions logic
old_location_options = r"""  const locationOptions = \[
    \{ label: `Your Address: \$\{profile\?\.address \|\| 'N/A'\}`, value: profile\?\.address \|\| '' \},
    \{ label: `\$\{selectedMember\?\.name\}'s Address: \$\{selectedMember\?\.address \|\| 'N/A'\}`, value: selectedMember\?\.address \|\| '' \}
  \]\.filter\(opt => opt\.value\);"""

new_location_options = """  const formatBusinessAddress = (user?: UserProfile | null) => {
    if (!user) return null;
    const { businessName, address, city, state, pincode } = user;
    
    const addressParts = [address, city, state].filter(Boolean);
    let fullAddress = addressParts.join(', ');
    if (fullAddress && pincode) {
      fullAddress += ` - ${pincode}`;
    } else if (!fullAddress && pincode) {
      fullAddress = pincode;
    }
    
    if (businessName && fullAddress) {
      return `${businessName}, ${fullAddress}`;
    } else if (fullAddress) {
      return fullAddress;
    } else if (businessName) {
      return businessName;
    }
    return null;
  };

  const myAddress = formatBusinessAddress(profile);
  const theirAddress = formatBusinessAddress(selectedMember);

  const locationOptions = [];
  if (myAddress) {
    locationOptions.push({ label: `My Business Address - ${myAddress}`, value: myAddress });
  }
  if (selectedMember && theirAddress) {
    locationOptions.push({ label: `${selectedMember.name}'s Business Address - ${theirAddress}`, value: theirAddress });
  }
  locationOptions.push({ label: 'Online Meeting', value: 'Online Meeting' });
  locationOptions.push({ label: 'Other Location', value: 'Other' });"""

content = re.sub(old_location_options, new_location_options, content)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
