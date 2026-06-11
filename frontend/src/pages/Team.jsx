import { Container, Row, Col, Card } from 'react-bootstrap';
import { FaGithub, FaLinkedinIn, FaUsers } from 'react-icons/fa';
import './Team.css';

const teamMembers = [
  {
    id: 1,
    name: "Ahsan Fayyaz",
    role: "Lead Full-Stack Developer & Architect",
    contribution: "Designed system architecture, configured MongoDB schemas, built Express REST APIs, and developed 100% of the React frontend codebase.",
    github: "https://github.com/AhsanFayyaz13",
    linkedin: "https://www.linkedin.com/in/ahsan-fayyaz-a0a3a429a",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80"
  },
  {
    id: 2,
    name: "Owaimer Khalid",
    role: "UI/UX & Quality Assurance Lead",
    contribution: "Assisted with initial UI layout ideation, prepared presentation mockups, and handled client-side QA user testing.",
    github: "#",
    linkedin: "https://www.linkedin.com",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80"
  },
  {
    id: 3,
    name: "Murad Ali Khan",
    role: "Product Manager & Technical Writer",
    contribution: "Managed project delivery timelines, coordinated team assets, and compiled external project documentation.",
    github: "#",
    linkedin: "https://www.linkedin.com",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80"
  }
];

export default function Team() {
  return (
    <div className="team-page-wrapper py-5">
      <Container>
        {/* Header Section */}
        <div className="team-header text-center mb-5">
          <span className="team-subheading text-uppercase">
            <FaUsers className="sub-icon me-2" /> Meet The Creators
          </span>
          <h1 className="team-title mt-2">
            Our <span className="text-highlight">Team</span>
          </h1>
          <p className="team-subtitle mx-auto">
            The developers, designers, and managers behind MedEasy — working together to bring you digital healthcare solutions.
          </p>
        </div>

        {/* Members Grid */}
        <Row className="justify-content-center gy-4">
          {teamMembers.map((member) => (
            <Col key={member.id} lg={4} md={6} sm={12} className="d-flex">
              <Card className="team-page-card border-0 shadow-sm w-100 p-4 d-flex flex-column align-items-center text-center">
                <div className="team-page-avatar-wrapper mb-3">
                  <Card.Img
                    variant="top"
                    src={member.image}
                    alt={member.name}
                    className="team-page-avatar"
                  />
                </div>
                <Card.Body className="p-0 d-flex flex-column justify-content-between flex-grow-1 w-100">
                  <div>
                    <h4 className="team-page-name mb-1">{member.name}</h4>
                    <p className="team-page-role text-primary small mb-3">{member.role}</p>
                    <hr className="team-card-divider my-2" />
                    <p className="team-page-contribution text-muted small mb-4">{member.contribution}</p>
                  </div>
                  <div className="team-page-socials d-flex justify-content-center gap-3 mt-auto">
                    {member.github !== '#' ? (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="team-social-icon github"
                        aria-label={`${member.name} GitHub`}
                      >
                        <FaGithub />
                      </a>
                    ) : (
                      <span className="team-social-icon github disabled" title="No GitHub Profile" aria-hidden="true">
                        <FaGithub />
                      </span>
                    )}
                    {member.linkedin !== '#' ? (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="team-social-icon linkedin"
                        aria-label={`${member.name} LinkedIn`}
                      >
                        <FaLinkedinIn />
                      </a>
                    ) : (
                      <span className="team-social-icon linkedin disabled" title="No LinkedIn Profile" aria-hidden="true">
                        <FaLinkedinIn />
                      </span>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
}
