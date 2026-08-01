const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetOpenAnalytics2 = 'setAnalyticsModalCategory(label);';
const replacementOpenAnalytics2 = `setAnalyticsModalCategory(label);
              setAnalyticsLoading(true);
              setAnalyticsError(false);
              setTimeout(() => {
                setAnalyticsLoading(false);
              }, 600);`;

if (code.includes(targetOpenAnalytics2)) {
  code = code.replace(new RegExp('setAnalyticsModalCategory\\(label\\);', 'g'), replacementOpenAnalytics2);
}

fs.writeFileSync(file, code);
console.log('Patched state 2 successfully');
