// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import { Container, Row, Col, Card, Accordion } from "react-bootstrap";

const HelpCenter = () => {
  return (
    <div className="page-wrapper">
      <div className="page-content">
        <Container className="mt-4 help-container">
          <Row className="justify-content-center">
            <Col md={8}>
              <Card className="help-card">
                <Card.Header className="text-center help-header">
                  <h4>Help Center</h4>
                </Card.Header>
                <Card.Body>
                  <h5 className="mb-3 help-title">
                    Frequently Asked Questions
                  </h5>
                  <Accordion>
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>
                        How do I purchase software?
                      </Accordion.Header>
                      <Accordion.Body>
                        Click on "Shop Now" button on any product card. You'll
                        be redirected to AWS Marketplace to complete your
                        purchase.
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="1">
                      <Accordion.Header>
                        What happens after clicking Shop Now?
                      </Accordion.Header>
                      <Accordion.Body>
                        You'll be taken to the official AWS Marketplace page for
                        that product where you can view pricing, reviews, and
                        complete your purchase securely.
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default HelpCenter;
