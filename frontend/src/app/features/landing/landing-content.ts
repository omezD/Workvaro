// Landing page copy, prices and FAQ in one place, so they can be edited without touching layout code.

export interface Plan {
  name: string;
  /** Monthly price per employee in rupees; null = "Talk to us". */
  pricePerEmployee: number | null;
  audience: string;
  features: string[];
  highlighted?: boolean;
}

// PLACEHOLDER PRICES: replace with the real ones before publishing.
export const PLANS: Plan[] = [
  {
    name: 'Starter',
    pricePerEmployee: 49,
    audience: 'For teams finding their feet, up to 50 people.',
    features: ['Leave requests and balances', 'Daily check-in and check-out', 'Company directory and profiles', 'Holiday calendar'],
  },
  {
    name: 'Growth',
    pricePerEmployee: 99,
    audience: 'For companies with managers and an HR team.',
    features: ['Everything in Starter', 'Manager approvals and team calendar', 'Attendance corrections', 'Dashboards for every role', 'Audit log of every change'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    pricePerEmployee: null,
    audience: 'For larger companies with their own IT rules.',
    features: ['Everything in Growth', 'Google or Microsoft sign-in', 'Runs on your own servers', 'Priority support and onboarding'],
  },
];

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: 'How long does it take to set up?',
    a: 'A small company can be running in a day. HR adds departments, designations and people, publishes the holiday list, and everyone signs in with their work email.',
  },
  {
    q: 'Do weekends and public holidays count as leave?',
    a: 'No. Workvaro counts working days only, skipping Saturdays, Sundays and the holidays HR publishes. People see the exact number of days before they send a request.',
  },
  {
    q: 'Who can approve leave?',
    a: "The employee's own manager or HR. Nobody can approve their own request, and managers only see their direct reports.",
  },
  {
    q: 'Can employees use it on their phone?',
    a: 'Yes. Workvaro works in any phone browser, so people can check in, apply for leave and approve requests on the move.',
  },
  {
    q: 'How is our data protected?',
    a: 'Sign-in supports two-step verification and locks out repeated wrong passwords. Every person sees only what their role allows, bank details are encrypted, and every change is recorded.',
  },
  {
    q: 'What happens if someone forgets to check in?',
    a: 'They request an attendance fix with the right times and a reason. Their manager approves it, and the day is updated.',
  },
];
