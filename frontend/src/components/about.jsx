// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";

function About() {
  return (
    <div className="page-wrapper">
      <div className="page-content">
        <Container className="mt-4 about-container">
          <Row className="justify-content-center">
            <Col md={8}>
              <Card className="about-card">
                <Card.Header className="text-center about-header">
                  <h4>About Us</h4>
                </Card.Header>
                <Card.Body>
                  <p className="lead text-center about-text">
                    We provide software solutions for businesses.
                  </p>
                  <p className="text-center about-text">
                    Our mission is to simplify cloud service adoption and help
                    organizations accelerate their digital transformation
                    journey.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
}

export default About;
