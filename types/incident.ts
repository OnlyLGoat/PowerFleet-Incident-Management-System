export interface IncidentListItem {
  id: number;
  title: string;
  type: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "New" | "Open" | "In Progress" | "Waiting Client" | "Waiting Technician" | "Resolved" | "Closed" | "Cancelled";
  slaStatus?: string;
  createdAt: string;
  vehicle?: {
    name: string;
    licensePlate: string;
  };
  reportedBy?: {
    companyName?: string;
    user?: {
      name: string;
    };
  };
  assignedTo?: {
    internalUser?: {
      user?: {
        name: string;
      };
    };
  };
}

export interface DBTechnician {
  id: number;
  name: string;
  specialty: string;
}
