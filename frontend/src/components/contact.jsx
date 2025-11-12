// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";

const Contact = () => {
  return (
    <div className="page-wrapper">
      <div className="page-content">
        <Container className="mt-4 contact-container">
          <Row className="justify-content-center">
            <Col md={6}>
              <Card className="contact-card">
                <Card.Header className="contact-header">
                  <h4>Contact Information</h4>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <strong className="contact-label">📧 Email:</strong>
                    <br />
                    <a
                      href="mailto:support@company.com"
                      className="contact-link"
                    >
                      support@company.com
                    </a>
                  </div>
                  <div className="mb-3">
                    <strong className="contact-label">📞 Phone:</strong>
                    <br />
                    <a href="tel:+xxxxxxxxxx" className="contact-link">
                      +xxx xxx-xxxx
                    </a>
                  </div>
                  <div className="mb-3">
                    <strong className="contact-label">🕒 Hours:</strong>
                    <br />
                    <span className="contact-text">Mon-Fri: 9AM-6PM EST</span>
                  </div>
                  <Button
                    className="contact-btn w-100 mb-2"
                    href="tel:+xxxxxxxxxx"
                  >
                    Call Now
                  </Button>
                  <Button
                    className="contact-btn w-100"
                    href="mailto:support@company.com"
                  >
                    Send Email
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default Contact;
