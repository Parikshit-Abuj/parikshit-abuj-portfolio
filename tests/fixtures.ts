import type { PortfolioContent } from "../src/lib/portfolio";
export const fixture: PortfolioContent = {
  schemaVersion: 1,
  profile: {
    name: "Sample Engineer",
    title: "Software Developer",
    summary: "Builds and tests reliable applications.",
    email: "engineer@example.com",
    phone: "",
    location: "",
    availability: "",
    github: "https://github.com/example",
    linkedin: "",
  },
  skillGroups: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      visible: true,
      name: "Languages",
      skills: ["TypeScript", "SQL"],
    },
  ],
  experiences: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      visible: true,
      company: "Example Company",
      role: "Developer",
      location: "",
      startDate: "2026-01",
      endDate: "2026-05",
      current: false,
      bullets: ["Implemented and tested APIs."],
    },
  ],
  projects: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      visible: true,
      name: "Example Project",
      summary: "An editable portfolio with a synchronized resume.",
      technologies: ["React", "PostgreSQL"],
      bullets: [],
      demoUrl: "",
      githubUrl: "https://github.com/example/project",
      featured: true,
      status: "In progress",
    },
  ],
  education: [
    {
      id: "00000000-0000-4000-8000-000000000004",
      visible: true,
      qualification: "B.Tech, Computer Science",
      institution: "Example Institute",
      startYear: "2022",
      endYear: "2026",
    },
  ],
  certifications: [
    {
      id: "00000000-0000-4000-8000-000000000005",
      visible: true,
      name: "SQL",
      issuer: "Example",
      year: "",
      url: "",
    },
  ],
  languages: [
    {
      id: "00000000-0000-4000-8000-000000000006",
      visible: true,
      name: "English",
    },
  ],
};
