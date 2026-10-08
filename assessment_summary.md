# Spotter AI — Full Stack Developer Assessment Summary

## 📧 Email Overview

| Detail | Info |
|---|---|
| **From** | Ena — Spotter AI |
| **Position** | Full Stack Developer |
| **Time Limit** | 4 days / 16 work hours max |
| **Reward** | $100 bonus upon successful completion |

### Deliverables Required
1. ✅ Live hosted version (e.g., Vercel.app)
2. ✅ 3-5 minute Loom video walkthrough (app + code)
3. ✅ GitHub repository link

---

## 🎯 Assessment Objective

> **Build a Full-Stack app using Django (backend) + React (frontend)** that takes trip details as inputs and outputs route instructions with ELD (Electronic Logging Device) log sheets.

### Inputs
| Input | Description |
|---|---|
| **Current Location** | Driver's current position |
| **Pickup Location** | Where to pick up the load |
| **Dropoff Location** | Where to deliver the load |
| **Current Cycle Used (Hrs)** | Hours already used in the 70-hour/8-day cycle |

### Outputs
| Output | Description |
|---|---|
| **Route Map** | Map showing the full route with stops, rests, and fuel stops (use a free map API) |
| **Daily Log Sheets** | Filled-out ELD log sheets drawn on the graph grid — multiple sheets needed for longer trips |

### Assumptions
- **Property-carrying driver** (not passenger)
- **70 hrs / 8 days** cycle
- **No adverse driving conditions**
- **Fueling** at least once every **1,000 miles**
- **1 hour** for both pickup and drop-off activities

---

## 📋 FMCSA HOS Rules (Critical for Accurate Output)

### Core Limits (Property-Carrying Driver)

| Rule | Limit |
|---|---|
| **11-Hour Driving Limit** | Max 11 hours of driving after 10 consecutive hours off duty |
| **14-Hour Driving Window** | Cannot drive beyond the 14th consecutive hour after coming on duty (clock doesn't pause) |
| **30-Minute Rest Break** | Required after 8 cumulative hours of driving since last 30-min+ off-duty/sleeper period |
| **60/70-Hour On-Duty Limit** | Cannot drive after 70 hours on-duty in any 8 consecutive days |
| **34-Hour Restart** | 34+ consecutive hours off duty resets the 70-hour clock |
| **10-Hour Off-Duty** | Must have 10 consecutive hours off duty before driving again |

### Sleeper Berth Provision
- 7 consecutive hours in sleeper berth + 2 hours off-duty/sleeper berth = equivalent of 10 hours off
- Must recalculate 14-hour window and 11-hour limit after each rest period

### Daily Log Sheet Elements
The Record of Duty Status must include:
1. Date
2. Total miles driving today
3. Truck/tractor and trailer number
4. Name of carrier
5. Driver's signature
6. 24-hour period starting time
7. Main office address
8. Remarks (city/town/village + state abbreviation for each change of duty status)
9. Name of co-driver
10. Total hours in each duty status
11. Shipping document info

### Graph Grid — 4 Duty Status Rows
1. **Off Duty** — Released from all work responsibility
2. **Sleeper Berth** — Resting in sleeper berth
3. **Driving** — Operating the CMV
4. **On Duty (Not Driving)** — Loading, unloading, inspecting, fueling, waiting, etc.

> **Draw continuous lines** on the grid showing transitions between duty statuses over the 24-hour period.

---

## 🔑 Evaluation Criteria
1. **Accuracy** — Route calculations and HOS compliance must be correct
2. **UI/UX** — Good design and aesthetics can compensate for some inaccuracies
3. **Hosted version** will be tested for accuracy

---

## 📁 Reference Materials Available
- [Assessment Instructions](file:///c:/D%20Drive/Harsh%20Projects/web-development-portfolio/Spooter/Full%20Stack/new-full-stack-dev-assessment.docx) — Full requirements
- [FMCSA HOS Guide (PDF)](file:///c:/D%20Drive/Harsh%20Projects/web-development-portfolio/Spooter/Full%20Stack/fmcsa-hos-395-drivers-guide-to-hos-2022-04-28-0-1-.pdf) — 20-page regulatory guide
- [FMCSA Image](file:///c:/D%20Drive/Harsh%20Projects/web-development-portfolio/Spooter/Full%20Stack/fmsca-image.png) — Table of contents reference
- [Blank Paper Log](file:///c:/D%20Drive/Harsh%20Projects/web-development-portfolio/Spooter/Full%20Stack/blank-paper-log.png) — Template for the daily log sheet format
