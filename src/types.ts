import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type JobStatus = 'Not Applied' | 'Applied' | 'Rejected' | 'Selected';
export type JobMode = 'Remote' | 'Hybrid' | 'Onsite';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  mode: JobMode;
  experience: string; // e.g., "2-4 years"
  salary: string; // e.g., "$120k - $150k"
  postedAt: string; // ISO string
  description: string;
  link: string;
  tags: string[];
  source: 'LinkedIn' | 'Indeed' | 'Glassdoor' | 'Company Site';
}

export interface UserPreferences {
  keywords: string[];
  location: string;
  mode: JobMode | 'All';
  minExperience: number;
}

export interface SavedJob {
  jobId: string;
  status: JobStatus;
  savedAt: string;
  notes?: string;
}

export const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: 'Senior Frontend Engineer',
    company: 'Linear',
    location: 'San Francisco, CA',
    mode: 'Remote',
    experience: '5+ years',
    salary: '₹45L - ₹65L',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    description: 'We are looking for a Senior Frontend Engineer to join our core product team. You will be responsible for building high-performance, accessible, and beautiful user interfaces.',
    link: 'https://www.linkedin.com/jobs/view/linear-frontend',
    tags: ['React', 'TypeScript', 'Tailwind', 'Performance'],
    source: 'LinkedIn',
  },
  {
    id: '2',
    title: 'Product Designer',
    company: 'Stripe',
    location: 'New York, NY',
    mode: 'Hybrid',
    experience: '3-5 years',
    salary: '₹35L - ₹55L',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    description: 'Join Stripe to help build the economic infrastructure of the internet. You will work on complex design problems and create seamless experiences for millions of users.',
    link: 'https://www.glassdoor.com/job-listing/stripe-designer',
    tags: ['Product Design', 'Figma', 'Systems', 'UX'],
    source: 'Glassdoor',
  },
  {
    id: '3',
    title: 'Full Stack Developer',
    company: 'Vercel',
    location: 'Remote',
    mode: 'Remote',
    experience: '2-4 years',
    salary: '₹30L - ₹50L',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    description: 'Vercel is looking for a Full Stack Developer to help us build the future of the web. You will work with Next.js, React, and Node.js.',
    link: 'https://vercel.com/jobs/fullstack',
    tags: ['Next.js', 'React', 'Node.js', 'PostgreSQL'],
    source: 'Company Site',
  },
  {
    id: '4',
    title: 'Software Engineer, Infrastructure',
    company: 'OpenAI',
    location: 'San Francisco, CA',
    mode: 'Onsite',
    experience: '4+ years',
    salary: '₹55L - ₹85L',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    description: 'Help us build and scale the infrastructure that powers the world\'s most advanced AI models.',
    link: 'https://www.indeed.com/viewjob?jk=openai-infra',
    tags: ['Python', 'Kubernetes', 'Distributed Systems', 'Go'],
    source: 'Indeed',
  },
  {
    id: '5',
    title: 'Frontend Developer',
    company: 'Framer',
    location: 'Amsterdam, NL',
    mode: 'Hybrid',
    experience: '2+ years',
    salary: '₹25L - ₹40L',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    description: 'Join the team building the best design and publishing tool for the web.',
    link: 'https://framer.com/jobs/frontend',
    tags: ['React', 'Canvas', 'TypeScript', 'Motion'],
    source: 'Company Site',
  },
  {
    id: '6',
    title: 'UX Engineer',
    company: 'Airbnb',
    location: 'Remote',
    mode: 'Remote',
    experience: '3+ years',
    salary: '₹40L - ₹60L',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    description: 'Bridge the gap between design and engineering at Airbnb. Create high-fidelity prototypes and production-ready components.',
    link: 'https://www.linkedin.com/jobs/view/airbnb-ux',
    tags: ['React', 'Design Systems', 'Prototyping', 'Accessibility'],
    source: 'LinkedIn',
  }
];
