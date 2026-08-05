const fs = require('fs');

const files = {
  'lib/services/similar-incidents.service.ts': [
    { find: /pastResolved && pastResolved\.length/g, replace: 'pastResolved?.length' },
  ],
  'app/api/ai/approve/route.ts': [
    { find: /body && body\.incidentId/g, replace: 'body?.incidentId' },
    { find: /body && body\.acceptedTasks/g, replace: 'body?.acceptedTasks' },
  ],
  'app/users/page.tsx': [
    { find: /user && user\.role/g, replace: 'user?.role' },
    { find: /editingUser \? \(\n\s*editingUser\.role ===/g, replace: 'editingUser?.role ===' }, // Handle nested ternaries or similar, actually let's just do manual fixes for these because the regexes are hard.
  ],
  'lib/ai/task-suggester.service.ts': [
    { find: /targetIncident && targetIncident\.title/g, replace: 'targetIncident?.title' },
    { find: /pastTickets && pastTickets\.length/g, replace: 'pastTickets?.length' },
  ],
  'components/incidents/AdminIncidentTable.tsx': [
    { find: /interface AdminIncidentTableProps \{\n  incidents: /g, replace: 'interface AdminIncidentTableProps {\n  readonly incidents: ' },
    { find: /  dbTechnicians: /g, replace: '  readonly dbTechnicians?: ' },
  ],
  'components/ui/label.tsx': [
    { find: /<LabelPrimitive.Root/g, replace: '<LabelPrimitive.Root htmlFor={props.htmlFor}' }
  ],
  'lib/services/task.service.ts': [
    { find: /tasks && tasks\.length/g, replace: 'tasks?.length' },
    { find: /incident && incident\.id/g, replace: 'incident?.id' },
  ],
  'app/api/incidents/[id]/attachments/route.ts': [
    { find: /isNaN\(/g, replace: 'Number.isNaN(' },
    { find: /parseInt\(/g, replace: 'Number.parseInt(' },
    { find: /import path from "path";/g, replace: 'import path from "node:path";' },
  ],
  'components/incidents/IncidentStatusPriorityPanel.tsx': [
    { find: /interface IncidentStatusPriorityPanelProps \{/g, replace: 'interface IncidentStatusPriorityPanelProps {\n  readonly incidentId: number;\n  readonly currentStatus: string;\n  readonly currentPriority: string;\n  readonly onUpdate: () => void;\n}' },
  ],
  'app/incidents/new/page.tsx': [
    
  ],
  'lib/services/attachment.service.ts': [
    { find: /attachment && attachment\.id/g, replace: 'attachment?.id' },
  ],
  'app/api/ai/suggest-tasks/route.ts': [
    { find: /body && body\.incidentId/g, replace: 'body?.incidentId' },
  ],
  'app/incidents/[id]/impact/page.tsx': [
    { find: /> </g, replace: '> {" "}<' }
  ],
  'lib/ai/similar-intelligence.service.ts': [
    { find: /pastResolved\.find\(\(p\) => p\.id === result\.relevantPastTicketId\)/g, replace: 'pastResolved.some((p) => p.id === result.relevantPastTicketId)' }
  ],
};

// Just going to fix the ones that are very predictable.
for (const [file, changes] of Object.entries(files)) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    for (const change of changes) {
      content = content.replace(change.find, change.replace);
    }
    fs.writeFileSync(file, content);
  }
}
