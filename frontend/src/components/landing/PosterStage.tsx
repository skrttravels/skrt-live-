"use client";

import { useEffect } from "react";
import { useSkrtEngine } from "./useSkrtEngine";
import "./landing.css";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Sora:wght@400;500;600;700;800&family=Barlow+Condensed:wght@500;700;800&display=swap";

/**
 * SKRT Transport landing page markup.
 *
 * Direct JSX transcription of the original `index.html`. Element structure,
 * classes, data-attributes, ARIA roles and inline SVGs are preserved so the
 * ported stylesheet and engine behave exactly as in the source project.
 *
 * The landing stylesheet's body-level rules are scoped to `body.skrt-landing`
 * so they don't leak into the dashboard routes; the class (and the Google
 * fonts link) are attached only while this page is mounted.
 */
export default function PosterStage() {
  useEffect(() => {
    document.body.classList.add("skrt-landing");

    let fontLink = document.querySelector<HTMLLinkElement>(
      `link[href="${FONT_HREF}"]`
    );
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href = FONT_HREF;
      document.head.appendChild(fontLink);
    }

    const bgPreload = document.createElement("link");
    bgPreload.rel = "preload";
    bgPreload.as = "image";
    bgPreload.href = "/landscape-main.png";
    document.head.appendChild(bgPreload);

    return () => {
      document.body.classList.remove("skrt-landing");
      bgPreload.remove();
    };
  }, []);

  useSkrtEngine();

  return (
    <>
      <main className="stage">
        <div className="stage-star" aria-hidden="true" />

        <div className="poster-shell">
          <div className="poster">
            <div className="poster-noise" aria-hidden="true" />
            <div className="poster-orbit orbit-left" aria-hidden="true" />
            <div className="poster-orbit orbit-right" aria-hidden="true" />

            <div className="poster-scene">
              <div className="poster-track">
                {/* HOME */}
                <section id="home" className="poster-section home-section">
                  <span className="section-label">HOME</span>
                  <div className="home-stage">
                    <div className="home-feature-row">
                      <a
                        className="home-brand-stack"
                        href="/login"
                        aria-label="Open admin login"
                      >
                        <div className="home-globe-layer">
                          <img
                            src="/home-globe.png"
                            alt=""
                            className="home-globe-image"
                          />
                        </div>
                        <img
                          src="/home-logo.png"
                          alt=""
                          className="home-section-logo"
                        />
                      </a>
                      <div className="home-side">
                        <div className="home-hero-copy">
                          <div className="home-intro-bar">
                            NATIONWIDE FREIGHT VISIBILITY
                          </div>
                          <p className="home-hero-kicker">Modern Logistics</p>
                          <h2 className="home-hero-title">
                            <span className="home-hero-line home-hero-line-powering">
                              Powering
                            </span>
                            <span className="home-hero-line home-hero-line-enterprises">
                              Enterprises
                            </span>
                          </h2>
                        </div>
                        <p className="support-panel-copy">
                          Transform your logistics operations with real-time
                          tracking, intelligent analytics, and automated fleet
                          management. Built for scale.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ABOUT */}
                <section id="about" className="poster-section about-section">
                  <span className="section-label">ABOUT</span>
                  <div className="about-decor" aria-hidden="true">
                    <img
                      src="/ellipse-409-wide.svg"
                      alt=""
                      className="about-ellipse about-ellipse-left"
                    />
                    <img
                      src="/ellipse-409-wide.svg"
                      alt=""
                      className="about-ellipse about-ellipse-right"
                    />
                  </div>
                  <div className="about-carousel-shell about-carousel-shell-full">
                    <div
                      className="about-carousel"
                      data-about-carousel
                      aria-label="About SKRT carousel"
                      tabIndex={0}
                    >
                      <article
                        className="about-card tone-rose"
                        data-about-card
                      >
                        <h3>50+ Years of Trust</h3>
                        <p>
                          Started by our grandfather more than 50 years ago, the
                          business grew from one vehicle into a trusted transport
                          service.
                        </p>
                      </article>
                      <article
                        className="about-card tone-lilac"
                        data-about-card
                      >
                        <h3>Truck-Driven Operations</h3>
                        <p>
                          Our trucks are the backbone of the service, moving
                          goods safely with careful checks, planning, and
                          reliable dispatch.
                        </p>
                      </article>
                      <article
                        className="about-card tone-cream"
                        data-about-card
                      >
                        <h3>Goods Delivery Made Simple</h3>
                        <p>
                          We handle pickup, loading, route planning, and delivery
                          so shipments reach the right place on time and in good
                          condition.
                        </p>
                      </article>
                      <article
                        className="about-card tone-sky"
                        data-about-card
                      >
                        <h3>Live Tracking Updates</h3>
                        <p>
                          Track your goods and vehicle status in real time, so
                          you always know where the shipment is and what comes
                          next.
                        </p>
                      </article>
                      <article
                        className="about-card tone-sand"
                        data-about-card
                      >
                        <h3>Reliable Freight Support</h3>
                        <p>
                          From route coordination to customer updates, our team
                          keeps every delivery organized, responsive, and
                          dependable.
                        </p>
                      </article>
                      <article
                        className="about-card tone-lilac"
                        data-about-card
                      >
                        <h3>Online Access To Service</h3>
                        <p>
                          This website makes it easier to learn about our
                          transport work, follow shipments, and connect with the
                          team quickly.
                        </p>
                      </article>
                    </div>

                    <div className="about-carousel-footer">
                      <button
                        type="button"
                        className="about-carousel-arrow"
                        data-about-prev
                        aria-label="Previous about card"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className="about-carousel-arrow"
                        data-about-next
                        aria-label="Next about card"
                      >
                        →
                      </button>
                    </div>
                  </div>
                </section>

                {/* SERVICES */}
                <section
                  id="services"
                  className="poster-section services-section"
                >
                  <span className="section-label">SERVICES</span>
                  <div className="services-board">
                    <button
                      type="button"
                      className="panel service-panel service-panel-button"
                      data-service-card
                      data-service-kicker="01"
                      data-service-title="Road Freight"
                      data-service-detail="Regional and long-haul delivery with hands-on dispatch support."
                      data-service-points="Regional delivery|Dedicated trucks|Careful handling"
                      aria-haspopup="dialog"
                      aria-controls="service-modal"
                    >
                      <h2>Road Freight</h2>
                    </button>
                    <button
                      type="button"
                      className="panel service-panel service-panel-button"
                      data-service-card
                      data-service-kicker="02"
                      data-service-title="Fleet Tracking"
                      data-service-detail="Live route visibility, status updates, and proactive shipment monitoring."
                      data-service-points="Live progress|Shipment alerts|Route visibility"
                      aria-haspopup="dialog"
                      aria-controls="service-modal"
                    >
                      <h2>Fleet Tracking</h2>
                    </button>
                    <button
                      type="button"
                      className="panel service-panel service-panel-button"
                      data-service-card
                      data-service-kicker="03"
                      data-service-title="Warehouse Support"
                      data-service-detail="Cross-docking, short-term storage, and loading support for busy freight flows."
                      data-service-points="Cross-docking|Short-term storage|Loading support"
                      aria-haspopup="dialog"
                      aria-controls="service-modal"
                    >
                      <h2>Warehouse Support</h2>
                    </button>
                  </div>
                </section>

                {/* TRACKING */}
                <section
                  id="tracking"
                  className="poster-section tracking-section"
                >
                  <span className="section-label">TRACKING</span>
                  <div className="lane-grid tracking-grid">
                    <article className="panel panel-form tracking-form-card left-lane">
                      <form id="tracking-form" noValidate>
                        <label>
                          <span>Vehicle Number</span>
                          <input
                            type="text"
                            name="vehicleNumber"
                            autoComplete="off"
                            placeholder="MH-03-EW-2342"
                          />
                        </label>
                        <p className="tracking-form-note">
                          Use the vehicle number from your dispatch slip or
                          vehicle plate record.
                        </p>
                        <p
                          className="tracking-form-status"
                          data-tracking-status
                          aria-live="polite"
                        />
                        <button type="submit" className="pill-button">
                          Track vehicle
                        </button>
                      </form>
                    </article>

                    <article
                      className="panel tracking-map-card right-lane"
                      aria-live="polite"
                    >
                      <div
                        className="tracking-map-shell tracking-map-empty"
                        data-tracking-map
                      >
                        <div className="tracking-map-header">
                          <div>
                            <p className="tracking-map-kicker">
                              Tracking details
                            </p>
                            <h2 data-tracking-title>Awaiting vehicle details</h2>
                            <p
                              className="tracking-map-copy"
                              data-tracking-copy
                            >
                              Enter a vehicle number to load live shipment
                              details.
                            </p>
                          </div>
                          <div className="tracking-map-badge" data-tracking-badge>
                            Idle
                          </div>
                        </div>
                        <div className="tracking-map-summary">
                          <div className="tracking-summary-item">
                            <span>Shipment / LR No</span>
                            <strong data-tracking-consignment>--</strong>
                          </div>
                          <div className="tracking-summary-item">
                            <span>Status</span>
                            <strong data-tracking-status-line>--</strong>
                          </div>
                          <div className="tracking-summary-item">
                            <span>Driver</span>
                            <strong data-tracking-driver>--</strong>
                          </div>
                          <div className="tracking-summary-item">
                            <span>From</span>
                            <strong data-tracking-from>--</strong>
                          </div>
                          <div className="tracking-summary-item">
                            <span>To</span>
                            <strong data-tracking-to>--</strong>
                          </div>
                          <div className="tracking-summary-item">
                            <span>Route</span>
                            <strong data-tracking-route>--</strong>
                          </div>
                          <div className="tracking-summary-item">
                            <span>Current Location</span>
                            <strong data-tracking-current-location>--</strong>
                          </div>
                          <div className="tracking-summary-item">
                            <span>Cargo Type</span>
                            <strong data-tracking-cargo>--</strong>
                          </div>
                          <div className="tracking-summary-item">
                            <span>Challan No</span>
                            <strong data-tracking-challan>--</strong>
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                </section>

                {/* CONTACT */}
                <section
                  id="contact"
                  className="poster-section contact-section"
                >
                  <span className="section-label">CONTACT US</span>
                  <div className="lane-grid">
                    <aside className="left-lane contact-copy">
                      <div className="copy-stack">
                        <p className="eyebrow">Contact.</p>
                        <p className="detail-text">+91 86196 06627</p>
                        <p className="micro-text">
                          Available 24/7 for routing, scheduling, and shipment
                          support.
                        </p>
                      </div>
                      <div className="copy-stack">
                        <p className="eyebrow">Email.</p>
                        <p className="detail-text">skrttransport@gmail.com</p>
                      </div>
                    </aside>

                    <aside className="middle-lane contact-socials">
                      <div className="copy-stack socials-stack">
                        <p className="eyebrow">Socials.</p>
                        <div className="social-links">
                          <a
                            className="social-link social-link-whatsapp"
                            href="https://wa.me/91861960627"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Chat on WhatsApp"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M20.5 11.9a8.5 8.5 0 0 1-12.61 7.44L3 20l.67-4.66A8.5 8.5 0 1 1 20.5 11.9Zm-8.5-6.83a6.83 6.83 0 0 0-5.77 10.48L6.04 17l2.1-.55A6.83 6.83 0 1 0 12 5.07Zm3.94 9.14c-.18.5-.92.92-1.27.96-.34.04-.68.06-1.1-.08a9.3 9.3 0 0 1-4.1-2.84 4.83 4.83 0 0 1-.93-1.23 1.11 1.11 0 0 1 .1-1.1c.12-.18.26-.32.39-.47.13-.15.26-.21.44-.21h.32c.1 0 .24-.04.38.29.14.34.49 1.18.53 1.27.04.1.07.22.01.35-.06.13-.09.21-.18.33l-.26.32c-.08.1-.18.21-.08.39.1.18.47.77 1.02 1.25.71.64 1.31.84 1.5.94.2.1.31.08.43-.05l.55-.63c.14-.15.27-.13.45-.07.18.06 1.13.53 1.32.63.19.1.32.15.37.23.05.08.05.44-.13.94Z" />
                            </svg>
                            <span>WhatsApp</span>
                          </a>
                          <a
                            className="social-link social-link-instagram"
                            href="https://www.instagram.com"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open Instagram"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <rect
                                x="3.5"
                                y="3.5"
                                width="17"
                                height="17"
                                rx="4.5"
                                fill="none"
                              />
                              <circle cx="12" cy="12" r="4.2" fill="none" />
                              <circle
                                cx="17.4"
                                cy="6.6"
                                r="1.05"
                                fill="currentColor"
                                stroke="none"
                              />
                            </svg>
                            <span>Instagram</span>
                          </a>
                          <a
                            className="social-link social-link-facebook"
                            href="https://www.facebook.com/share/18yjddfFLM/"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open Facebook"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M14 4.5h2.7V2H14c-2.1 0-3.7 1.6-3.7 3.7V8H7.5v3.2h2.8v8.3h3.2v-8.3h2.7L16.7 8h-3.2V5.5c0-.6.5-1 1.1-1Z" />
                            </svg>
                            <span>Facebook</span>
                          </a>
                        </div>
                      </div>
                    </aside>

                    <article className="panel contact-map-card right-lane">
                      <div className="contact-map-shell">
                        <div className="contact-map-header">
                          <div>
                            <p className="eyebrow">Location.</p>
                          </div>
                          <a
                            className="contact-map-chip"
                            href="https://www.google.com/maps?q=25.325789570016102,74.63056296323371"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open map
                          </a>
                        </div>
                        <div className="contact-map-frame-wrap">
                          <iframe
                            className="contact-map-frame"
                            title="SKRT Transport location map"
                            src="https://www.google.com/maps?q=25.325789570016102,74.63056296323371&z=17&output=embed"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    </article>
                  </div>
                </section>
              </div>
            </div>

            <div className="home-truck-layer" aria-hidden="true">
              <div className="truck-scene truck-scene-forward">
                <div
                  className="truck-light truck-light-head"
                  aria-hidden="true"
                >
                  <img src="/HeadLight-polygon.svg" alt="" />
                </div>
                <div
                  className="truck-light truck-light-rear"
                  aria-hidden="true"
                >
                  <img src="/rear-light.svg" alt="" />
                </div>
                <div className="truck-wheel truck-wheel-rear" />
                <div className="truck-wheel truck-wheel-middle" />
                <div className="truck-wheel truck-wheel-front" />
                <img
                  className="home-truck"
                  src="/truckk.png"
                  alt="Cargo truck"
                  loading="eager"
                  decoding="sync"
                  draggable={false}
                />
              </div>
              <div className="truck-scene truck-scene-reverse">
                <div
                  className="truck-light truck-light-head"
                  aria-hidden="true"
                >
                  <img src="/HeadLight-polygon.svg" alt="" />
                </div>
                <div
                  className="truck-light truck-light-rear"
                  aria-hidden="true"
                >
                  <img src="/rear-light.svg" alt="" />
                </div>
                <div className="truck-wheel truck-wheel-rear" />
                <div className="truck-wheel truck-wheel-middle" />
                <div className="truck-wheel truck-wheel-front" />
                <img
                  className="home-truck"
                  src="/truckk.png"
                  alt="Cargo truck facing the opposite direction"
                  loading="eager"
                  decoding="sync"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Service modal */}
      <div className="service-modal" id="service-modal" aria-hidden="true">
        <div className="service-modal-backdrop" data-service-close />
        <section
          className="panel service-modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-modal-title"
          aria-describedby="service-modal-copy"
          tabIndex={-1}
        >
          <div className="service-modal-flip">
            <div className="service-modal-face service-modal-front">
              <p className="service-modal-kicker" id="service-modal-kicker">
                Service 01
              </p>
              <h2 className="service-modal-title" id="service-modal-title">
                Road Freight
              </h2>
              <p className="service-modal-copy" id="service-modal-copy">
                Regional and long-haul delivery with hands-on dispatch support.
              </p>
              <div className="service-modal-front-meta">
                <span className="service-modal-chip">Auto opens</span>
                <span className="service-modal-chip">Truck advances</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* WhatsApp modal */}
      <div className="whatsapp-modal" id="whatsapp-modal" aria-hidden="true">
        <div className="whatsapp-modal-backdrop" data-whatsapp-close />
        <section
          className="panel whatsapp-modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-modal-title"
          tabIndex={-1}
        >
          <button
            type="button"
            className="whatsapp-modal-close"
            data-whatsapp-close
            aria-label="Close WhatsApp form"
          >
            ×
          </button>
          <p className="eyebrow whatsapp-modal-kicker">WhatsApp</p>
          <h2 className="whatsapp-modal-title" id="whatsapp-modal-title">
            Enter your details
          </h2>
          <p className="whatsapp-modal-copy">
            We&rsquo;ll open WhatsApp with your name and email included in the
            message.
          </p>
          <form id="whatsapp-form" className="whatsapp-form">
            <label>
              <span>Name</span>
              <input type="text" name="name" autoComplete="name" required />
            </label>
            <label>
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <div className="whatsapp-modal-actions">
              <button
                type="button"
                className="pill-button whatsapp-cancel"
                data-whatsapp-close
              >
                Cancel
              </button>
              <button type="submit" className="pill-button whatsapp-submit">
                Open WhatsApp
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
