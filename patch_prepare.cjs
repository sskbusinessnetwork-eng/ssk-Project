const fs = require('fs');
const file = 'src/lib/database.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
`function prepareUserPayload(partialData: any, existingPhoto: string = '') {
  const cleanData = { ...partialData };
  const extraToSave: any = {};
  let photo = cleanData.profile_photo !== undefined ? cleanData.profile_photo : existingPhoto;
  
  if (cleanData.status && typeof cleanData.status === 'string') {
    const s = cleanData.status.toUpperCase();
    cleanData.status = (s === 'INACTIVE') ? 'SUSPENDED' : s;
  }
  if (cleanData.membership_status && typeof cleanData.membership_status === 'string') {
    const ms = cleanData.membership_status.toUpperCase();
    cleanData.membership_status = (ms === 'INACTIVE') ? 'SUSPENDED' : ms;
  }

  if (photo && photo.includes('|||')) {
    const parts = photo.split('|||');
    photo = parts[0];
    try {
      Object.assign(extraToSave, JSON.parse(parts[1] || '{}'));
    } catch (e) {}
  }`,
`function prepareUserPayload(partialData: any, existingPhoto: string = '') {
  const cleanData = { ...partialData };
  const extraToSave: any = {};
  
  // ALWAYS extract existing extraData from existingPhoto first!
  let currentActualPhoto = '';
  if (existingPhoto && existingPhoto.includes('|||')) {
    const parts = existingPhoto.split('|||');
    currentActualPhoto = parts[0];
    try {
      Object.assign(extraToSave, JSON.parse(parts[1] || '{}'));
    } catch (e) {}
  } else {
    currentActualPhoto = existingPhoto;
  }

  let photo = cleanData.profile_photo !== undefined ? cleanData.profile_photo : currentActualPhoto;
  
  // If the passed photo happens to contain ||| (unlikely but possible), parse it too
  if (photo && photo.includes('|||')) {
    const parts = photo.split('|||');
    photo = parts[0];
    try {
      Object.assign(extraToSave, JSON.parse(parts[1] || '{}'));
    } catch (e) {}
  }

  if (cleanData.status && typeof cleanData.status === 'string') {
    const s = cleanData.status.toUpperCase();
    cleanData.status = (s === 'INACTIVE') ? 'SUSPENDED' : s;
  }
  if (cleanData.membership_status && typeof cleanData.membership_status === 'string') {
    const ms = cleanData.membership_status.toUpperCase();
    cleanData.membership_status = (ms === 'INACTIVE') ? 'SUSPENDED' : ms;
  }
`
);
fs.writeFileSync(file, code);
