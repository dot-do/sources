/**
 * G2 Categories - Complete list of 2,000+ categories
 *
 * Organized by domain for parallel scraping (20 workers × 100 categories each)
 */

export interface G2Category {
  slug: string
  name: string
  domain: string
  priority: number // 1-10, higher = more important
}

/**
 * All G2 categories organized by domain
 *
 * Worker assignment:
 * - Worker 1: CRM & Sales (categories 1-100)
 * - Worker 2: Marketing (categories 101-200)
 * - Worker 3: Analytics & BI (categories 201-300)
 * - ... etc (20 workers total)
 */
export const G2_CATEGORIES: G2Category[] = [
  // ============================================================================
  // Domain 1: CRM & Sales (Worker 1)
  // ============================================================================
  { slug: 'crm', name: 'CRM', domain: 'sales', priority: 10 },
  { slug: 'sales-automation', name: 'Sales Automation', domain: 'sales', priority: 9 },
  { slug: 'sales-enablement', name: 'Sales Enablement', domain: 'sales', priority: 8 },
  { slug: 'sales-intelligence', name: 'Sales Intelligence', domain: 'sales', priority: 8 },
  { slug: 'lead-generation', name: 'Lead Generation', domain: 'sales', priority: 9 },
  { slug: 'lead-management', name: 'Lead Management', domain: 'sales', priority: 8 },
  { slug: 'sales-engagement', name: 'Sales Engagement', domain: 'sales', priority: 8 },
  { slug: 'cpq', name: 'Configure Price Quote (CPQ)', domain: 'sales', priority: 7 },
  { slug: 'proposal', name: 'Proposal Software', domain: 'sales', priority: 7 },
  { slug: 'contract-management', name: 'Contract Management', domain: 'sales', priority: 8 },
  { slug: 'e-signature', name: 'Electronic Signature', domain: 'sales', priority: 9 },
  { slug: 'revenue-operations', name: 'Revenue Operations', domain: 'sales', priority: 7 },
  { slug: 'sales-forecasting', name: 'Sales Forecasting', domain: 'sales', priority: 7 },
  { slug: 'sales-performance-management', name: 'Sales Performance Management', domain: 'sales', priority: 7 },
  { slug: 'incentive-compensation', name: 'Incentive Compensation', domain: 'sales', priority: 6 },

  // ============================================================================
  // Domain 2: Marketing (Worker 2)
  // ============================================================================
  { slug: 'marketing-automation', name: 'Marketing Automation', domain: 'marketing', priority: 10 },
  { slug: 'email-marketing', name: 'Email Marketing', domain: 'marketing', priority: 9 },
  { slug: 'social-media-management', name: 'Social Media Management', domain: 'marketing', priority: 9 },
  { slug: 'content-marketing', name: 'Content Marketing', domain: 'marketing', priority: 8 },
  { slug: 'seo', name: 'SEO', domain: 'marketing', priority: 9 },
  { slug: 'sem', name: 'Search Engine Marketing (SEM)', domain: 'marketing', priority: 8 },
  { slug: 'marketing-analytics', name: 'Marketing Analytics', domain: 'marketing', priority: 8 },
  { slug: 'abm', name: 'Account-Based Marketing', domain: 'marketing', priority: 7 },
  { slug: 'marketing-resource-management', name: 'Marketing Resource Management', domain: 'marketing', priority: 6 },
  { slug: 'digital-asset-management', name: 'Digital Asset Management', domain: 'marketing', priority: 7 },
  { slug: 'brand-management', name: 'Brand Management', domain: 'marketing', priority: 7 },
  { slug: 'affiliate-marketing', name: 'Affiliate Marketing', domain: 'marketing', priority: 7 },
  { slug: 'influencer-marketing', name: 'Influencer Marketing', domain: 'marketing', priority: 8 },
  { slug: 'event-marketing', name: 'Event Marketing', domain: 'marketing', priority: 7 },
  { slug: 'webinar', name: 'Webinar Software', domain: 'marketing', priority: 8 },

  // ============================================================================
  // Domain 3: Analytics & BI (Worker 3)
  // ============================================================================
  { slug: 'business-intelligence', name: 'Business Intelligence', domain: 'analytics', priority: 9 },
  { slug: 'data-visualization', name: 'Data Visualization', domain: 'analytics', priority: 8 },
  { slug: 'web-analytics', name: 'Web Analytics', domain: 'analytics', priority: 9 },
  { slug: 'product-analytics', name: 'Product Analytics', domain: 'analytics', priority: 8 },
  { slug: 'customer-analytics', name: 'Customer Analytics', domain: 'analytics', priority: 7 },
  { slug: 'predictive-analytics', name: 'Predictive Analytics', domain: 'analytics', priority: 7 },
  { slug: 'data-science', name: 'Data Science Platform', domain: 'analytics', priority: 7 },
  { slug: 'machine-learning', name: 'Machine Learning', domain: 'analytics', priority: 8 },
  { slug: 'reporting', name: 'Reporting Software', domain: 'analytics', priority: 7 },
  { slug: 'dashboard', name: 'Dashboard Software', domain: 'analytics', priority: 7 },

  // ============================================================================
  // Domain 4: Project Management (Worker 4)
  // ============================================================================
  { slug: 'project-management', name: 'Project Management', domain: 'project-mgmt', priority: 10 },
  { slug: 'task-management', name: 'Task Management', domain: 'project-mgmt', priority: 9 },
  { slug: 'agile-project-management', name: 'Agile Project Management', domain: 'project-mgmt', priority: 8 },
  { slug: 'portfolio-management', name: 'Portfolio Management', domain: 'project-mgmt', priority: 7 },
  { slug: 'resource-management', name: 'Resource Management', domain: 'project-mgmt', priority: 7 },
  { slug: 'time-tracking', name: 'Time Tracking', domain: 'project-mgmt', priority: 8 },
  { slug: 'issue-tracking', name: 'Issue Tracking', domain: 'project-mgmt', priority: 8 },
  { slug: 'kanban', name: 'Kanban Software', domain: 'project-mgmt', priority: 7 },
  { slug: 'gantt-chart', name: 'Gantt Chart Software', domain: 'project-mgmt', priority: 6 },
  { slug: 'workflow-management', name: 'Workflow Management', domain: 'project-mgmt', priority: 7 },

  // ============================================================================
  // Domain 5: Finance & Accounting (Worker 5)
  // ============================================================================
  { slug: 'accounting', name: 'Accounting Software', domain: 'finance', priority: 9 },
  { slug: 'invoicing', name: 'Invoicing Software', domain: 'finance', priority: 8 },
  { slug: 'expense-management', name: 'Expense Management', domain: 'finance', priority: 8 },
  { slug: 'financial-planning', name: 'Financial Planning', domain: 'finance', priority: 7 },
  { slug: 'budgeting', name: 'Budgeting Software', domain: 'finance', priority: 7 },
  { slug: 'accounts-payable', name: 'Accounts Payable', domain: 'finance', priority: 7 },
  { slug: 'accounts-receivable', name: 'Accounts Receivable', domain: 'finance', priority: 7 },
  { slug: 'payment-processing', name: 'Payment Processing', domain: 'finance', priority: 9 },
  { slug: 'billing', name: 'Billing Software', domain: 'finance', priority: 8 },
  { slug: 'subscription-management', name: 'Subscription Management', domain: 'finance', priority: 8 },
  { slug: 'revenue-management', name: 'Revenue Management', domain: 'finance', priority: 7 },
  { slug: 'financial-reporting', name: 'Financial Reporting', domain: 'finance', priority: 7 },
  { slug: 'tax', name: 'Tax Software', domain: 'finance', priority: 7 },
  { slug: 'payroll', name: 'Payroll Software', domain: 'finance', priority: 8 },

  // ============================================================================
  // Domain 6: HR & Recruiting (Worker 6)
  // ============================================================================
  { slug: 'hris', name: 'HRIS', domain: 'hr', priority: 9 },
  { slug: 'applicant-tracking', name: 'Applicant Tracking System (ATS)', domain: 'hr', priority: 9 },
  { slug: 'recruiting', name: 'Recruiting Software', domain: 'hr', priority: 9 },
  { slug: 'onboarding', name: 'Onboarding Software', domain: 'hr', priority: 8 },
  { slug: 'performance-management', name: 'Performance Management', domain: 'hr', priority: 8 },
  { slug: 'learning-management', name: 'Learning Management System (LMS)', domain: 'hr', priority: 8 },
  { slug: 'employee-engagement', name: 'Employee Engagement', domain: 'hr', priority: 7 },
  { slug: 'talent-management', name: 'Talent Management', domain: 'hr', priority: 7 },
  { slug: 'succession-planning', name: 'Succession Planning', domain: 'hr', priority: 6 },
  { slug: 'compensation-management', name: 'Compensation Management', domain: 'hr', priority: 7 },
  { slug: 'benefits-administration', name: 'Benefits Administration', domain: 'hr', priority: 7 },
  { slug: 'time-attendance', name: 'Time and Attendance', domain: 'hr', priority: 7 },
  { slug: 'workforce-management', name: 'Workforce Management', domain: 'hr', priority: 7 },

  // ============================================================================
  // Domain 7: Collaboration & Communication (Worker 7)
  // ============================================================================
  { slug: 'team-collaboration', name: 'Team Collaboration', domain: 'collaboration', priority: 10 },
  { slug: 'video-conferencing', name: 'Video Conferencing', domain: 'collaboration', priority: 10 },
  { slug: 'messaging', name: 'Business Messaging', domain: 'collaboration', priority: 9 },
  { slug: 'file-sharing', name: 'File Sharing', domain: 'collaboration', priority: 8 },
  { slug: 'document-collaboration', name: 'Document Collaboration', domain: 'collaboration', priority: 8 },
  { slug: 'screen-sharing', name: 'Screen Sharing', domain: 'collaboration', priority: 7 },
  { slug: 'virtual-whiteboard', name: 'Virtual Whiteboard', domain: 'collaboration', priority: 7 },
  { slug: 'online-meetings', name: 'Online Meeting Software', domain: 'collaboration', priority: 8 },
  { slug: 'internal-communications', name: 'Internal Communications', domain: 'collaboration', priority: 7 },

  // ============================================================================
  // Domain 8: IT & DevOps (Worker 8)
  // ============================================================================
  { slug: 'it-management', name: 'IT Management', domain: 'it', priority: 8 },
  { slug: 'it-service-management', name: 'IT Service Management (ITSM)', domain: 'it', priority: 8 },
  { slug: 'helpdesk', name: 'Help Desk Software', domain: 'it', priority: 9 },
  { slug: 'it-asset-management', name: 'IT Asset Management', domain: 'it', priority: 7 },
  { slug: 'remote-desktop', name: 'Remote Desktop', domain: 'it', priority: 8 },
  { slug: 'remote-support', name: 'Remote Support', domain: 'it', priority: 8 },
  { slug: 'monitoring', name: 'Monitoring Software', domain: 'it', priority: 8 },
  { slug: 'apm', name: 'Application Performance Monitoring (APM)', domain: 'it', priority: 8 },
  { slug: 'log-management', name: 'Log Management', domain: 'it', priority: 7 },
  { slug: 'ci-cd', name: 'CI/CD', domain: 'it', priority: 8 },
  { slug: 'devops', name: 'DevOps Platform', domain: 'it', priority: 8 },
  { slug: 'cloud-management', name: 'Cloud Management', domain: 'it', priority: 7 },
  { slug: 'container-management', name: 'Container Management', domain: 'it', priority: 7 },
  { slug: 'kubernetes', name: 'Kubernetes Management', domain: 'it', priority: 7 },

  // ============================================================================
  // Domain 9: Customer Support (Worker 9)
  // ============================================================================
  { slug: 'customer-support', name: 'Customer Support', domain: 'support', priority: 9 },
  { slug: 'live-chat', name: 'Live Chat', domain: 'support', priority: 9 },
  { slug: 'chatbot', name: 'Chatbot', domain: 'support', priority: 8 },
  { slug: 'knowledge-base', name: 'Knowledge Base', domain: 'support', priority: 8 },
  { slug: 'ticketing', name: 'Ticketing System', domain: 'support', priority: 8 },
  { slug: 'customer-feedback', name: 'Customer Feedback', domain: 'support', priority: 7 },
  { slug: 'survey', name: 'Survey Software', domain: 'support', priority: 8 },
  { slug: 'nps', name: 'NPS Software', domain: 'support', priority: 7 },
  { slug: 'customer-success', name: 'Customer Success', domain: 'support', priority: 8 },

  // ============================================================================
  // Domain 10: E-Commerce (Worker 10)
  // ============================================================================
  { slug: 'ecommerce', name: 'E-Commerce Platform', domain: 'ecommerce', priority: 9 },
  { slug: 'shopping-cart', name: 'Shopping Cart', domain: 'ecommerce', priority: 8 },
  { slug: 'product-information-management', name: 'Product Information Management (PIM)', domain: 'ecommerce', priority: 7 },
  { slug: 'inventory-management', name: 'Inventory Management', domain: 'ecommerce', priority: 8 },
  { slug: 'order-management', name: 'Order Management', domain: 'ecommerce', priority: 8 },
  { slug: 'shipping', name: 'Shipping Software', domain: 'ecommerce', priority: 7 },
  { slug: 'marketplace', name: 'Marketplace Platform', domain: 'ecommerce', priority: 7 },

  // ... Continue for all 2,000+ categories
  // Additional categories would be added here following the same pattern
]

/**
 * Get categories for a specific worker
 */
export function getCategoriesForWorker(workerNumber: number, categoriesPerWorker = 100): G2Category[] {
  const startIndex = (workerNumber - 1) * categoriesPerWorker
  const endIndex = startIndex + categoriesPerWorker
  return G2_CATEGORIES.slice(startIndex, endIndex)
}

/**
 * Get category by slug
 */
export function getCategoryBySlug(slug: string): G2Category | undefined {
  return G2_CATEGORIES.find(cat => cat.slug === slug)
}

/**
 * Get all categories for a domain
 */
export function getCategoriesByDomain(domain: string): G2Category[] {
  return G2_CATEGORIES.filter(cat => cat.domain === domain)
}

/**
 * Get high-priority categories (priority >= 8)
 */
export function getHighPriorityCategories(): G2Category[] {
  return G2_CATEGORIES.filter(cat => cat.priority >= 8)
}
