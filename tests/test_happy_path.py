"""
ZT Compass Beta — Playwright Happy Path Test
Tests the full user journey: Landing → QuickScan → Dashboard → Roadmap → Playbooks → Region overlay
"""
import pytest
import re
from playwright.sync_api import Page, expect

BASE_URL = "https://ztcompass-demo-1086527681263.europe-west1.run.app"


def test_landing_page_loads(page: Page):
    page.goto(BASE_URL)
    expect(page.locator("text=Zero Trust score")).to_be_visible(timeout=15000)
    expect(page.locator("text=Start QuickScan")).to_be_visible()


def test_region_selector(page: Page):
    page.goto(BASE_URL)
    # Default region CH should be selected
    ch_button = page.locator("text=Switzerland")
    expect(ch_button).to_be_visible()
    # Switch to UK
    page.locator("text=United Kingdom").click()
    # Switch to EU
    page.locator("text=European Union").click()
    # Switch back to CH
    page.locator("text=Switzerland").click()


def test_full_quickscan_happy_path(page: Page):
    page.goto(BASE_URL)
    # Select CH region and start scan
    page.locator("text=Switzerland").click()
    page.locator("text=Start QuickScan").click()

    # Wait for scan page to load
    page.wait_for_url(re.compile(r"/scan"), timeout=15000)
    expect(page.locator("text=Question 1 of 10")).to_be_visible(timeout=10000)

    # Answer all 10 questions with "yes"
    for i in range(10):
        expect(page.locator(f"text=Question {i + 1} of 10")).to_be_visible(timeout=5000)
        page.locator("text=Yes").first.click()
        if i < 9:
            page.locator("text=Next →").click()

    # On last question, finish button should be enabled
    finish_btn = page.locator("text=View My Dashboard →")
    expect(finish_btn).to_be_visible(timeout=5000)
    finish_btn.click()

    # Should navigate to dashboard
    page.wait_for_url(re.compile(r"/dashboard/"), timeout=15000)
    expect(page.locator("text=Zero Trust Dashboard")).to_be_visible(timeout=10000)


def test_dashboard_shows_scores(page: Page):
    page.goto(BASE_URL)
    page.locator("text=Start QuickScan").click()
    page.wait_for_url(re.compile(r"/scan"), timeout=15000)

    # Answer all questions as "partial"
    for i in range(10):
        page.wait_for_selector(f"text=Question {i + 1} of 10", timeout=5000)
        page.locator("text=Partial").first.click()
        if i < 9:
            page.locator("text=Next →").click()

    page.locator("text=View My Dashboard →").click()
    page.wait_for_url(re.compile(r"/dashboard/"), timeout=15000)

    # Check pillar tiles are visible
    expect(page.locator("text=Identity")).to_be_visible()
    expect(page.locator("text=Devices")).to_be_visible()
    expect(page.locator("text=Network")).to_be_visible()
    expect(page.locator("text=Applications")).to_be_visible()
    expect(page.locator("text=Data")).to_be_visible()

    # Check risks and wins
    expect(page.locator("text=Top 5 Risks")).to_be_visible()
    expect(page.locator("text=Top 5 Quick Wins")).to_be_visible()

    # Check region banner
    expect(page.locator("text=Full guide →")).to_be_visible()


def test_email_capture(page: Page):
    page.goto(BASE_URL)
    page.locator("text=Start QuickScan").click()
    page.wait_for_url(re.compile(r"/scan"), timeout=15000)

    for i in range(10):
        page.wait_for_selector(f"text=Question {i + 1} of 10", timeout=5000)
        page.locator("text=No").first.click()
        if i < 9:
            page.locator("text=Next →").click()

    page.locator("text=View My Dashboard →").click()
    page.wait_for_url(re.compile(r"/dashboard/"), timeout=15000)
    page.wait_for_selector("text=Get your full report", timeout=10000)

    # Fill in email
    page.locator('input[type="email"]').fill("test@example.com")
    page.locator("text=Get Full Report →").click()

    # Should show success message
    expect(page.locator("text=You're on the list!")).to_be_visible(timeout=5000)


def test_roadmap_generates(page: Page):
    page.goto(BASE_URL)
    page.locator("text=Start QuickScan").click()
    page.wait_for_url(re.compile(r"/scan"), timeout=15000)

    for i in range(10):
        page.wait_for_selector(f"text=Question {i + 1} of 10", timeout=5000)
        page.locator("text=Yes").first.click()
        if i < 9:
            page.locator("text=Next →").click()

    page.locator("text=View My Dashboard →").click()
    page.wait_for_url(re.compile(r"/dashboard/"), timeout=15000)
    page.locator("text=Generate My Roadmap").first.click()

    page.wait_for_url(re.compile(r"/roadmap/"), timeout=15000)
    # Roadmap loading (can take up to 35s for Gemini + fallback)
    expect(page.locator("text=Your Zero Trust Roadmap")).to_be_visible(timeout=40000)
    expect(page.locator("text=30 Days")).to_be_visible()
    expect(page.locator("text=60 Days")).to_be_visible()
    expect(page.locator("text=90 Days")).to_be_visible()


def test_playbooks_load(page: Page):
    page.goto(f"{BASE_URL}/playbooks")
    expect(page.locator("text=MFA Rollout Path")).to_be_visible(timeout=10000)
    expect(page.locator("text=Conditional Access")).to_be_visible()
    expect(page.locator("text=MDM Adoption")).to_be_visible()
    expect(page.locator("text=EDR Coverage")).to_be_visible()
    expect(page.locator("text=Incident Readiness")).to_be_visible()


def test_region_overlays(page: Page):
    for region, expected_text in [("CH", "Switzerland"), ("UK", "United Kingdom"), ("EU", "European Union")]:
        page.goto(f"{BASE_URL}/regions/{region}")
        expect(page.locator(f"text={expected_text}")).to_be_visible(timeout=10000)


def test_session_persistence(page: Page):
    """Verify that completing scan and refreshing dashboard still shows data."""
    page.goto(BASE_URL)
    page.locator("text=Start QuickScan").click()
    page.wait_for_url(re.compile(r"/scan"), timeout=15000)

    for i in range(10):
        page.wait_for_selector(f"text=Question {i + 1} of 10", timeout=5000)
        page.locator("text=Yes").first.click()
        if i < 9:
            page.locator("text=Next →").click()

    page.locator("text=View My Dashboard →").click()
    page.wait_for_url(re.compile(r"/dashboard/"), timeout=15000)

    # Store current URL
    dashboard_url = page.url

    # Refresh the page
    page.reload()
    page.wait_for_load_state("networkidle", timeout=10000)

    # Dashboard should still show data
    expect(page.locator("text=Zero Trust Dashboard")).to_be_visible(timeout=10000)
