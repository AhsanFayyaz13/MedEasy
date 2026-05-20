import { Container, Card, Row, Col, ListGroup, Button } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhone, FaEdit } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

/** Profile page skeleton – data from AuthContext in Phase 2. */
export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="profile-page">
      <Container className="py-5">
        <h1 className="page-title">My Profile</h1>
        <Row className="gy-4">
          <Col md={4}>
            <Card className="profile-card text-center">
              <Card.Body>
                <div className="avatar-circle">
                  <FaUser size={40} />
                </div>
                <h4 className="mt-3">{user?.name || 'Guest User'}</h4>
                <p className="text-muted">{user?.role || 'Patient'}</p>
                <Button variant="outline-primary" size="sm"><FaEdit className="me-1" />Edit Profile</Button>
              </Card.Body>
            </Card>
          </Col>

          <Col md={8}>
            <Card className="profile-card">
              <Card.Body>
                <h5 className="section-heading">Account Details</h5>
                <ListGroup variant="flush">
                  <ListGroup.Item><FaEnvelope className="me-2 text-primary" />{user?.email || 'example@medeasy.pk'}</ListGroup.Item>
                  <ListGroup.Item><FaPhone className="me-2 text-primary" />{user?.phone || '+92 300 0000000'}</ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>

            <Card className="profile-card mt-3">
              <Card.Body>
                <h5 className="section-heading">Recent Orders</h5>
                <p className="text-muted">Your orders will appear here.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
