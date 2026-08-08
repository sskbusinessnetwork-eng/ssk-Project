const fs = require('fs');

const content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const targetActions = `                          {/* Actions */}
                          <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle">
                            {canUpdate ? (
                              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2">`;
                              
const replaceActions = `                          {/* Actions */}
                          <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle text-right sm:text-left">
                            {canUpdate ? (
                              <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end sm:justify-start gap-1.5 sm:gap-2">`;

const newContent = content.replace(targetActions, replaceActions);
fs.writeFileSync('src/pages/Meetings.tsx', newContent, 'utf-8');
console.log("SUCCESS");
