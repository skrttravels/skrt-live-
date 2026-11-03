"use client";

import { useEffect } from "react";

/**
 * SKRT Transport scroll/truck engine.
 *
 * This is a near-verbatim port of the original `script.js`. The animation
 * algorithm, DOM class/style toggling, carousel math, service-card focus
 * logic, tracking form and WhatsApp modal behavior are all preserved exactly.
 *
 * Differences from the original, kept minimal:
 *  - Wrapped in a React effect instead of `DOMContentLoaded`.
 *  - `import.meta.env.VITE_API_BASE_URL` -> `process.env.NEXT_PUBLIC_API_BASE_URL`.
 *  - Every listener / rAF / interval is tracked and torn down on unmount.
 */
export function useSkrtEngine() {
  useEffect(() => {
    const API_BASE_URL = String(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/+$/, "");

    // --- cleanup registry -------------------------------------------------
    type Cleanup = () => void;
    const cleanups: Cleanup[] = [];
    const on = (
      target: EventTarget | null | undefined,
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (!target) return;
      target.addEventListener(type, handler, options);
      cleanups.push(() => target.removeEventListener(type, handler, options));
    };

    const posterTrack = document.querySelector<HTMLElement>(".poster-track");
    const posterShell = document.querySelector<HTMLElement>(".poster-shell");
    const contactForm = document.getElementById(
      "logistics-form"
    ) as HTMLFormElement | null;
    const contactStatus = document.querySelector<HTMLElement>(
      "[data-contact-status]"
    );
    const trackingForm = document.getElementById(
      "tracking-form"
    ) as HTMLFormElement | null;
    const trackingMap = document.querySelector<HTMLElement>(
      "[data-tracking-map]"
    );
    const trackingTitle = document.querySelector<HTMLElement>(
      "[data-tracking-title]"
    );
    const trackingCopy = document.querySelector<HTMLElement>(
      "[data-tracking-copy]"
    );
    const trackingBadge = document.querySelector<HTMLElement>(
      "[data-tracking-badge]"
    );
    const trackingStatus = document.querySelector<HTMLElement>(
      "[data-tracking-status]"
    );
    const trackingConsignment = document.querySelector<HTMLElement>(
      "[data-tracking-consignment]"
    );
    const trackingStatusLine = document.querySelector<HTMLElement>(
      "[data-tracking-status-line]"
    );
    const trackingDriver = document.querySelector<HTMLElement>(
      "[data-tracking-driver]"
    );
    const trackingFrom = document.querySelector<HTMLElement>(
      "[data-tracking-from]"
    );
    const trackingTo = document.querySelector<HTMLElement>("[data-tracking-to]");
    const trackingCurrentLocation = document.querySelector<HTMLElement>(
      "[data-tracking-current-location]"
    );
    const trackingRoute = document.querySelector<HTMLElement>(
      "[data-tracking-route]"
    );
    const trackingCargo = document.querySelector<HTMLElement>(
      "[data-tracking-cargo]"
    );
    const trackingChallan = document.querySelector<HTMLElement>(
      "[data-tracking-challan]"
    );
    const sections = [
      ...document.querySelectorAll<HTMLElement>(".poster-section"),
    ];
    const truckLayer = document.querySelector<HTMLElement>(".home-truck-layer");
    const servicesSection =
      document.querySelector<HTMLElement>(".services-section");
    const servicesSectionIndex = sections.indexOf(servicesSection!);
    const serviceCards = [
      ...document.querySelectorAll<HTMLElement>("[data-service-card]"),
    ];
    const serviceModal = document.getElementById("service-modal");
    const serviceModalCard =
      document.querySelector<HTMLElement>(".service-modal-card");
    const serviceModalKicker = document.getElementById("service-modal-kicker");
    const serviceModalTitle = document.getElementById("service-modal-title");
    const serviceModalCopy = document.getElementById("service-modal-copy");
    const aboutCarousel = document.querySelector<HTMLElement>(
      "[data-about-carousel]"
    );
    const aboutCards = [
      ...document.querySelectorAll<HTMLElement>("[data-about-card]"),
    ];
    const aboutPrevButton = document.querySelector<HTMLElement>(
      "[data-about-prev]"
    );
    const aboutNextButton = document.querySelector<HTMLElement>(
      "[data-about-next]"
    );
    const aboutCurrent = document.querySelector<HTMLElement>(
      "[data-about-current]"
    );
    const aboutTotal =
      document.querySelector<HTMLElement>("[data-about-total]");
    const trackingSubmitButton =
      trackingForm?.querySelector<HTMLButtonElement>(".pill-button");
    const contactSubmitButton =
      contactForm?.querySelector<HTMLButtonElement>(".pill-button");
    const whatsappModal = document.getElementById("whatsapp-modal");
    const whatsappForm = document.getElementById(
      "whatsapp-form"
    ) as HTMLFormElement | null;
    const whatsappLink = document.querySelector<HTMLElement>(
      ".social-link-whatsapp"
    );
    const whatsappCloseTargets = [
      ...document.querySelectorAll<HTMLElement>("[data-whatsapp-close]"),
    ];
    const mobileServiceReveal = window.matchMedia("(max-width: 660px)");
    let activeServiceCard: HTMLElement | null = null;
    let activeServiceCardIndex = -1;
    let serviceModalDismissedIndex = -1;
    let aboutActiveIndex = 0;
    let aboutAutoplayId: number | null = null;
    const aboutAutoplayDelay = 4200;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    let truckCenterX = 0;

    sections.forEach((section, index) => {
      section.style.setProperty("--reveal-index", String(index));
    });

    if (!posterTrack || !posterShell || sections.length === 0) {
      return;
    }

    const root = document.documentElement;
    const trackingCopyDefault =
      "Enter a vehicle number to load live shipment details.";
    const trackingTitleDefault = "Awaiting vehicle details";
    const trackingBadgeDefault = "Idle";
    const trackingSummaryDefault = "--";
    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    let horizontalDistance = 0;
    let targetProgress = 0;
    let currentProgress = 0;
    let maxScroll = 0;
    let needsRender = true;
    let lastScrollY = window.scrollY;
    let scrollDirection = "forward";
    let animationFrameId: number | null = null;
    let scrollFrameId: number | null = null;

    function clamp(value: number, min: number, max: number) {
      return Math.min(Math.max(value, min), max);
    }

    function lerp(start: number, end: number, amount: number) {
      return start + (end - start) * amount;
    }

    function clampByte(value: number) {
      return Math.min(255, Math.max(0, Math.round(value)));
    }

    function hexToRgb(hex: string) {
      const normalized = hex.replace("#", "");

      return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
      };
    }

    function mixRgba(
      startHex: string,
      endHex: string,
      amount: number,
      alpha: number
    ) {
      const start = hexToRgb(startHex);
      const end = hexToRgb(endHex);

      return `rgba(${clampByte(lerp(start.r, end.r, amount))}, ${clampByte(
        lerp(start.g, end.g, amount)
      )}, ${clampByte(lerp(start.b, end.b, amount))}, ${alpha.toFixed(3)})`;
    }

    function buildApiUrl(path: string) {
      const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;

      return `${normalizedBase}${normalizedPath}`;
    }

    async function requestJson(path: string, options: RequestInit = {}) {
      const response = await fetch(buildApiUrl(path), {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        ...options,
      });

      let payload: any = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok || payload.success === false) {
        throw new Error(
          payload.message || `Request failed with status ${response.status}`
        );
      }

      return payload.data ?? payload;
    }

    function setStatusMessage(
      element: HTMLElement | null,
      message: string,
      kind = ""
    ) {
      if (!element) {
        return;
      }

      element.textContent = message;
      element.classList.remove("is-error", "is-success");

      if (kind) {
        element.classList.add(kind);
      }
    }

    function setButtonLoading(
      button: HTMLButtonElement | null | undefined,
      isLoading: boolean,
      loadingText: string,
      idleText: string
    ) {
      if (!button) {
        return;
      }

      button.disabled = isLoading;
      button.classList.toggle("is-loading", isLoading);
      button.textContent = isLoading ? loadingText : idleText;
    }

    function openWhatsAppModal() {
      if (!whatsappModal) {
        return;
      }

      whatsappModal.classList.add("is-open");
      whatsappModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("whatsapp-modal-open");

      const firstInput =
        whatsappForm?.querySelector<HTMLInputElement>('input[name="name"]');
      firstInput?.focus();
    }

    function closeWhatsAppModal() {
      if (!whatsappModal) {
        return;
      }

      whatsappModal.classList.remove("is-open");
      whatsappModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("whatsapp-modal-open");
    }

    function buildWhatsAppUrl(name: string, email: string) {
      const phone = "8619606627";
      const message = [
        "Hello SKRT Transport,",
        `My name is ${name}.`,
        `My email is ${email}.`,
        "I would like to get in touch regarding your services.",
      ].join(" ");

      return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }

    if (contactForm) {
      on(contactForm, "submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(contactForm);
        const payload = {
          name: String(formData.get("name") || "").trim(),
          email: String(formData.get("email") || "").trim(),
          phone: String(formData.get("phone") || "").trim(),
          message: String(formData.get("message") || "").trim(),
        };

        if (!payload.name || !payload.email || !payload.message) {
          setStatusMessage(
            contactStatus,
            "Please fill in your name, email, and message.",
            "is-error"
          );
          return;
        }

        setStatusMessage(contactStatus, "Sending your message…");
        setButtonLoading(contactSubmitButton, true, "Sending…", "Submit");

        try {
          await requestJson("/public/contact", {
            method: "POST",
            body: JSON.stringify(payload),
          });

          contactForm.reset();
          setStatusMessage(
            contactStatus,
            "Thanks. Your message was sent successfully.",
            "is-success"
          );
        } catch (error: any) {
          setStatusMessage(
            contactStatus,
            error.message || "We could not send your message right now.",
            "is-error"
          );
        } finally {
          setButtonLoading(contactSubmitButton, false, "Sending…", "Submit");
        }
      });

      on(contactForm, "input", () => {
        if (contactStatus?.classList.contains("is-error")) {
          setStatusMessage(contactStatus, "");
        }
      });
    }

    on(whatsappLink, "click", (event) => {
      event.preventDefault();
      openWhatsAppModal();
    });

    whatsappCloseTargets.forEach((target) => {
      on(target, "click", closeWhatsAppModal);
    });

    on(whatsappModal, "click", (event) => {
      if (event.target === whatsappModal) {
        closeWhatsAppModal();
      }
    });

    on(whatsappForm, "submit", (event) => {
      event.preventDefault();

      const formData = new FormData(whatsappForm!);
      const name = String(formData.get("name") || "").trim();
      const email = String(formData.get("email") || "").trim();

      if (!name || !email) {
        return;
      }

      window.open(
        buildWhatsAppUrl(name, email),
        "_blank",
        "noopener,noreferrer"
      );
      whatsappForm!.reset();
      closeWhatsAppModal();
    });

    on(document, "keydown", (event) => {
      if (
        (event as KeyboardEvent).key === "Escape" &&
        whatsappModal?.classList.contains("is-open")
      ) {
        closeWhatsAppModal();
      }
    });

    function formatDateTime(value: string | number | Date) {
      if (!value) {
        return trackingSummaryDefault;
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return trackingSummaryDefault;
      }

      return dateFormatter.format(date);
    }

    // (kept for parity with the original source)
    function formatCoordinates(lat: number, lng: number) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return trackingSummaryDefault;
      }

      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    void formatCoordinates;

    function clearTrackingMap() {}

    function updateMetrics() {
      horizontalDistance = Math.max(
        0,
        (sections.length - 1) * window.innerWidth
      );

      root.style.setProperty("--horizontal-distance", `${horizontalDistance}px`);

      maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );

      if (truckLayer) {
        const truckRect = truckLayer.getBoundingClientRect();
        truckCenterX = truckRect.left + truckRect.width / 2;
      }
    }

    function routeProgressFromScroll() {
      if (maxScroll <= 0) {
        return 1;
      }

      return clamp(1 - window.scrollY / maxScroll, 0, 1);
    }

    function updateTargetProgress() {
      targetProgress = routeProgressFromScroll();
      needsRender = true;
      scheduleAnimationLoop();
    }

    function resetTrackingCard() {
      if (!trackingMap || !trackingTitle || !trackingCopy || !trackingBadge) {
        return;
      }

      trackingMap.classList.remove("tracking-map-ready");
      trackingMap.classList.add("tracking-map-empty");
      trackingBadge.textContent = trackingBadgeDefault;
      trackingTitle.textContent = trackingTitleDefault;
      trackingCopy.textContent = trackingCopyDefault;

      if (trackingConsignment)
        trackingConsignment.textContent = trackingSummaryDefault;
      if (trackingStatusLine)
        trackingStatusLine.textContent = trackingSummaryDefault;
      if (trackingDriver) trackingDriver.textContent = trackingSummaryDefault;
      if (trackingFrom) trackingFrom.textContent = trackingSummaryDefault;
      if (trackingTo) trackingTo.textContent = trackingSummaryDefault;
      if (trackingCurrentLocation)
        trackingCurrentLocation.textContent = trackingSummaryDefault;
      if (trackingRoute) trackingRoute.textContent = trackingSummaryDefault;
      if (trackingCargo) trackingCargo.textContent = trackingSummaryDefault;
      if (trackingChallan) trackingChallan.textContent = trackingSummaryDefault;
      clearTrackingMap();
    }

    function updateTrackingCard(tracking: any) {
      if (!trackingMap || !trackingTitle || !trackingCopy || !trackingBadge) {
        return;
      }

      const shipment = tracking?.shipment || {};
      const routeText =
        [tracking?.route?.origin, tracking?.route?.destination]
          .filter(Boolean)
          .join(" → ") || trackingSummaryDefault;
      const summaryText = tracking?.description
        ? `${tracking.description}${
            shipment.cargoType ? ` · ${shipment.cargoType}` : ""
          }`
        : `Route from ${routeText}.`;
      trackingMap.classList.remove("tracking-map-empty");
      trackingMap.classList.add("tracking-map-ready");
      trackingBadge.textContent = tracking?.currentStatus || "Live";
      trackingTitle.textContent = "Tracking details";
      trackingCopy.textContent = `${summaryText}${
        tracking?.lastUpdate
          ? ` Last updated ${formatDateTime(tracking.lastUpdate)}.`
          : ""
      }`.trim();

      if (trackingConsignment)
        trackingConsignment.textContent =
          tracking?.consignmentNumber || trackingSummaryDefault;
      if (trackingStatusLine)
        trackingStatusLine.textContent =
          tracking?.currentStatus || trackingSummaryDefault;
      if (trackingDriver)
        trackingDriver.textContent =
          [tracking?.driverName, tracking?.driverPhone]
            .filter(Boolean)
            .join(" • ") || trackingSummaryDefault;
      if (trackingFrom)
        trackingFrom.textContent =
          tracking?.route?.origin || shipment.origin || trackingSummaryDefault;
      if (trackingTo)
        trackingTo.textContent =
          tracking?.route?.destination ||
          shipment.destination ||
          trackingSummaryDefault;
      if (trackingCurrentLocation)
        trackingCurrentLocation.textContent =
          tracking?.currentLocation?.address ||
          tracking?.vehicleLocation?.address ||
          trackingSummaryDefault;
      if (trackingRoute) trackingRoute.textContent = routeText;
      if (trackingCargo)
        trackingCargo.textContent =
          shipment.cargoType || tracking?.packageType || trackingSummaryDefault;
      if (trackingChallan)
        trackingChallan.textContent =
          shipment.challanNo || trackingSummaryDefault;
    }

    function getAboutSlotConfig() {
      const width = window.innerWidth;

      if (width <= 660) {
        return {
          x: [0, 0, 0, 0, 0, 0],
          y: [-142, -72, 0, 72, 142, 214],
          scale: [0.9, 0.96, 1.02, 0.96, 0.9, 0.84],
          opacity: [1, 1, 1, 1, 1, 0],
          rotate: [0, 0, 0, 0, 0, 0],
        };
      }

      if (width <= 960) {
        return {
          x: [-320, -180, 0, 180, 320, 460],
          y: [16, 10, -22, 10, 16, 20],
          scale: [0.78, 0.88, 1.08, 0.92, 0.8, 0.7],
          opacity: [1, 1, 1, 1, 1, 0],
          rotate: [-6, -3, 0, 3, 6, 8],
        };
      }

      return {
        x: [-480, -260, 0, 260, 480, 680],
        y: [18, 10, -26, 10, 18, 24],
        scale: [0.76, 0.88, 1.12, 0.9, 0.78, 0.68],
        opacity: [1, 1, 1, 1, 1, 0],
        rotate: [-6, -3, 0, 3, 6, 8],
      };
    }

    function updateAboutCarousel(nextIndex = aboutActiveIndex) {
      if (!aboutCarousel || aboutCards.length === 0) {
        return;
      }

      aboutActiveIndex =
        (nextIndex + aboutCards.length) % aboutCards.length;
      const slots = getAboutSlotConfig();
      const middleSlot = 2;
      const slotCount = slots.x.length;

      aboutCards.forEach((card, index) => {
        let delta = index - aboutActiveIndex;
        const half = Math.floor(aboutCards.length / 2);

        if (delta >= half) {
          delta -= aboutCards.length;
        }

        if (delta < -half) {
          delta += aboutCards.length;
        }

        const slot = (delta + middleSlot + slotCount) % slotCount;
        const hidden = slots.opacity[slot] === 0;
        const depth = hidden
          ? 0
          : slot === middleSlot
          ? 1000
          : 100 - Math.abs(slot - middleSlot);

        card.style.setProperty("--card-x", `${slots.x[slot]}px`);
        card.style.setProperty("--card-y", `${slots.y[slot]}px`);
        card.style.setProperty("--card-scale", slots.scale[slot].toFixed(2));
        card.style.setProperty("--card-rotate", `${slots.rotate[slot]}deg`);
        card.style.setProperty("--card-opacity", slots.opacity[slot].toFixed(2));
        card.style.setProperty("--card-z", String(depth));
        card.style.pointerEvents = hidden ? "none" : "auto";
        card.classList.toggle("is-active", slot === middleSlot);
        card.dataset.hiddenSlot = hidden ? "true" : "false";
        card.setAttribute("aria-hidden", hidden ? "true" : "false");
        card.setAttribute(
          "aria-current",
          slot === middleSlot ? "true" : "false"
        );
      });

      if (aboutCurrent) {
        aboutCurrent.textContent = String(aboutActiveIndex + 1);
      }

      if (aboutTotal) {
        aboutTotal.textContent = String(aboutCards.length);
      }
    }

    function stopAboutAutoplay() {
      if (aboutAutoplayId !== null) {
        window.clearInterval(aboutAutoplayId);
        aboutAutoplayId = null;
      }
    }

    function startAboutAutoplay() {
      if (
        aboutCards.length === 0 ||
        prefersReducedMotion.matches ||
        aboutAutoplayId !== null
      ) {
        return;
      }

      aboutAutoplayId = window.setInterval(() => {
        updateAboutCarousel(aboutActiveIndex + 1);
      }, aboutAutoplayDelay);
    }

    function restartAboutAutoplay() {
      stopAboutAutoplay();
      startAboutAutoplay();
    }

    function closeServiceModal() {
      if (!serviceModal) return;

      serviceModalDismissedIndex = activeServiceCardIndex;
      serviceModal.classList.remove("is-open");
      serviceModal.classList.remove("is-flipped");
      serviceModal.setAttribute("aria-hidden", "true");

      if (activeServiceCard instanceof HTMLElement) {
        activeServiceCard.focus();
      }
    }

    function populateServiceModal(card: HTMLElement) {
      if (!serviceModalKicker || !serviceModalTitle || !serviceModalCopy) {
        return;
      }

      const kicker = card.dataset.serviceKicker || "Service";
      const title = card.dataset.serviceTitle || "Service";
      const detail = card.dataset.serviceDetail || "";

      serviceModalKicker.textContent = `Service ${kicker}`;
      serviceModalTitle.textContent = title;
      serviceModalCopy.textContent = detail;
    }

    function openServiceModal(
      card: HTMLElement,
      options: { auto?: boolean } = {}
    ) {
      if (!serviceModal) {
        return;
      }

      activeServiceCard = card;
      populateServiceModal(card);
      serviceModal.classList.add("is-open");
      serviceModal.setAttribute("aria-hidden", "false");

      if (!options.auto && serviceModalCard instanceof HTMLElement) {
        serviceModalCard.focus();
      }
    }

    function clearServiceCardFocus() {
      activeServiceCardIndex = -1;
      serviceModalDismissedIndex = -1;

      serviceCards.forEach((card) => {
        card.classList.remove("is-active", "is-dimmed");
        card.setAttribute("aria-expanded", "false");
      });

      if (serviceModal?.classList.contains("is-open")) {
        closeServiceModal();
      }
    }

    function updateServiceCardFocus(progress = currentProgress) {
      if (
        !servicesSection ||
        serviceCards.length === 0 ||
        servicesSectionIndex < 0
      ) {
        return;
      }

      if (mobileServiceReveal.matches) {
        clearServiceCardFocus();
        return;
      }

      const sectionLeft =
        servicesSectionIndex * window.innerWidth -
        (1 - progress) * horizontalDistance;
      const relativeTruckX = truckCenterX - sectionLeft;

      if (relativeTruckX < 0 || relativeTruckX > window.innerWidth) {
        clearServiceCardFocus();
        return;
      }

      const sectionProgress = clamp(
        relativeTruckX / window.innerWidth,
        0,
        0.9999
      );
      const nextIndex = Math.min(
        serviceCards.length - 1,
        Math.floor(sectionProgress * serviceCards.length)
      );

      if (nextIndex === activeServiceCardIndex) {
        if (
          !serviceModal?.classList.contains("is-open") &&
          nextIndex !== serviceModalDismissedIndex
        ) {
          openServiceModal(serviceCards[nextIndex], { auto: true });
        }
        return;
      }

      const previousIndex = activeServiceCardIndex;
      activeServiceCardIndex = nextIndex;
      serviceModalDismissedIndex = -1;

      serviceCards.forEach((card, index) => {
        const isActive = index === activeServiceCardIndex;
        card.classList.toggle("is-active", isActive);
        card.classList.toggle("is-dimmed", !isActive);
        card.setAttribute("aria-expanded", isActive ? "true" : "false");
      });

      if (serviceModal?.classList.contains("is-open")) {
        if (previousIndex >= 0) {
          closeServiceModal();
        }
        openServiceModal(serviceCards[activeServiceCardIndex], { auto: true });
        return;
      }

      if (activeServiceCardIndex !== serviceModalDismissedIndex) {
        openServiceModal(serviceCards[activeServiceCardIndex], { auto: true });
      }
    }

    function setupServiceCardReveal() {
      if (!servicesSection || serviceCards.length === 0) {
        return;
      }

      if (mobileServiceReveal.matches) {
        clearServiceCardFocus();
        return;
      }

      document.documentElement.classList.add("js-service-reveal");

      serviceCards.forEach((card, index) => {
        card.style.setProperty("--service-reveal-index", String(index));
      });

      if (
        prefersReducedMotion.matches ||
        !("IntersectionObserver" in window)
      ) {
        servicesSection.classList.add("is-revealed");
        updateServiceCardFocus();
        return;
      }

      const serviceRevealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            servicesSection.classList.add("is-revealed");
            updateServiceCardFocus();
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.38,
          rootMargin: "0px 0px -12% 0px",
        }
      );

      serviceRevealObserver.observe(servicesSection);
      cleanups.push(() => serviceRevealObserver.disconnect());
    }

    function updateBackground(progress: number) {
      const sunrise = clamp(1 - progress, 0, 1);
      const glow = Math.pow(sunrise, 1.15);

      root.style.setProperty("--bg-pan-x", `${(sunrise * 100).toFixed(2)}%`);
      root.style.setProperty(
        "--bg-overlay-start",
        mixRgba("#030712", "#23131e", glow * 0.7, 0.8 - glow * 0.2)
      );
      root.style.setProperty(
        "--bg-overlay-center",
        mixRgba("#121221", "#894e73", glow * 0.9, 0.42 - glow * 0.12)
      );
      root.style.setProperty(
        "--bg-overlay-end",
        mixRgba("#1d2739", "#ffe0a7", glow, 0.12 + glow * 0.18)
      );
    }

    function updateTruckLights() {
      if (!truckLayer) return;

      const isMoving = Math.abs(targetProgress - currentProgress) > 0.0025;

      truckLayer.classList.toggle("truck-moving", isMoving);
      truckLayer.classList.toggle("truck-stopped", !isMoving);
    }

    function updateTruckDirection() {
      if (!truckLayer) return;

      truckLayer.classList.toggle(
        "truck-direction-forward",
        scrollDirection !== "reverse"
      );
      truckLayer.classList.toggle(
        "truck-direction-reverse",
        scrollDirection === "reverse"
      );
    }

    function renderScene(progress: number) {
      const trackX = -(1 - progress) * horizontalDistance;
      const wheelTravel = (1 - progress) * horizontalDistance;
      posterTrack!.style.transform = `translate3d(${trackX}px, 0, 0)`;
      root.style.setProperty("--truck-wheel-spin", `${wheelTravel * 2.2}deg`);
      updateBackground(progress);
      updateTruckDirection();
      updateTruckLights();
      updateServiceCardFocus(progress);
    }

    function scheduleAnimationLoop() {
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(animationLoop);
      }
    }

    function animationLoop() {
      animationFrameId = null;
      const difference = targetProgress - currentProgress;

      if (Math.abs(difference) > 0.0005 || needsRender) {
        currentProgress = lerp(currentProgress, targetProgress, 0.14);
        renderScene(currentProgress);
        needsRender = false;

        if (Math.abs(targetProgress - currentProgress) > 0.0005 || needsRender) {
          scheduleAnimationLoop();
        }
      }
    }

    function handleScrollFrame() {
      scrollFrameId = null;

      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY) {
        scrollDirection = "forward";
      } else if (currentScrollY < lastScrollY) {
        scrollDirection = "reverse";
      }

      lastScrollY = currentScrollY;
      updateTruckDirection();
      updateTargetProgress();
    }

    if (trackingForm) {
      on(trackingForm, "submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(trackingForm);
        const vehicleNumber = String(
          formData.get("vehicleNumber") || ""
        ).trim();

        if (!vehicleNumber) {
          setStatusMessage(
            trackingStatus,
            "Enter a vehicle number to load the tracking map.",
            "is-error"
          );
          resetTrackingCard();
          return;
        }

        setStatusMessage(trackingStatus, "Loading live vehicle details…");
        setButtonLoading(
          trackingSubmitButton,
          true,
          "Loading…",
          "Track vehicle"
        );

        try {
          const tracking = await requestJson(
            `/public/tracking/${encodeURIComponent(vehicleNumber)}`
          );
          updateTrackingCard(tracking);
          setStatusMessage(
            trackingStatus,
            `Tracking details loaded for ${
              tracking.vehicleNumber || tracking.consignmentNumber
            }.`,
            "is-success"
          );
        } catch (error: any) {
          resetTrackingCard();
          setStatusMessage(
            trackingStatus,
            error.message || "No tracking data found for that number.",
            "is-error"
          );
        } finally {
          setButtonLoading(
            trackingSubmitButton,
            false,
            "Loading…",
            "Track vehicle"
          );
        }
      });

      on(trackingForm, "input", () => {
        if (trackingStatus?.classList.contains("is-error")) {
          setStatusMessage(trackingStatus, "");
        }
      });
    }

    if (serviceCards.length > 0 && serviceModal) {
      serviceCards.forEach((card) => {
        on(card, "click", (event) => {
          event.stopPropagation();
          openServiceModal(card);
        });
      });
    }

    if (aboutCards.length > 0) {
      aboutCards.forEach((card, index) => {
        on(card, "click", () => {
          updateAboutCarousel(index);
          restartAboutAutoplay();
        });
      });

      on(aboutPrevButton, "click", () => {
        updateAboutCarousel(aboutActiveIndex - 1);
        restartAboutAutoplay();
      });

      on(aboutNextButton, "click", () => {
        updateAboutCarousel(aboutActiveIndex + 1);
        restartAboutAutoplay();
      });

      on(aboutCarousel, "keydown", (event) => {
        const key = (event as KeyboardEvent).key;
        if (key === "ArrowLeft") {
          event.preventDefault();
          updateAboutCarousel(aboutActiveIndex - 1);
          restartAboutAutoplay();
        }

        if (key === "ArrowRight") {
          event.preventDefault();
          updateAboutCarousel(aboutActiveIndex + 1);
          restartAboutAutoplay();
        }
      });

      const reducedMotionHandler = () => {
        if (prefersReducedMotion.matches) {
          stopAboutAutoplay();
        } else {
          startAboutAutoplay();
        }
      };
      prefersReducedMotion.addEventListener?.("change", reducedMotionHandler);
      cleanups.push(() =>
        prefersReducedMotion.removeEventListener?.(
          "change",
          reducedMotionHandler
        )
      );
    }

    on(
      window,
      "scroll",
      () => {
        if (scrollFrameId !== null) {
          return;
        }

        scrollFrameId = requestAnimationFrame(handleScrollFrame);
      },
      { passive: true }
    );

    on(window, "resize", () => {
      updateMetrics();
      updateTargetProgress();
      updateAboutCarousel();
    });

    const loadHandler = () => {
      window.scrollTo(0, 0);

      updateMetrics();
      updateTargetProgress();
      updateTruckDirection();
      updateAboutCarousel(0);
      startAboutAutoplay();
      resetTrackingCard();

      currentProgress = targetProgress;
      renderScene(currentProgress);
    };

    if (document.readyState === "complete") {
      loadHandler();
    } else {
      on(window, "load", loadHandler);
    }

    updateMetrics();
    updateTargetProgress();
    updateTruckDirection();
    updateAboutCarousel(0);
    setupServiceCardReveal();
    startAboutAutoplay();
    resetTrackingCard();
    currentProgress = targetProgress;
    renderScene(currentProgress);
    scheduleAnimationLoop();

    const mobileServiceRevealHandler = () => {
      if (mobileServiceReveal.matches) {
        clearServiceCardFocus();
      } else {
        setupServiceCardReveal();
      }
      renderScene(currentProgress);
    };
    mobileServiceReveal.addEventListener?.(
      "change",
      mobileServiceRevealHandler
    );
    cleanups.push(() =>
      mobileServiceReveal.removeEventListener?.(
        "change",
        mobileServiceRevealHandler
      )
    );

    // --- teardown ---------------------------------------------------------
    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (scrollFrameId !== null) cancelAnimationFrame(scrollFrameId);
      stopAboutAutoplay();
      cleanups.forEach((fn) => fn());
    };
  }, []);
}
