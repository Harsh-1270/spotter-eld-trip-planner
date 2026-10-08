# Spotter AI - Full Stack Developer Assessment

This repository contains the Full Stack application for the Spotter AI assessment. 

## Project Structure
- `/backend`: Django REST Framework (Stateless API, HOS Calculation Engine)
- `/frontend`: React (Vite) Application (Coming soon)

## Features
- **Stateless Architecture**: No database overhead. All trips are calculated in memory.
- **HOS Compliance**: Accurately simulates FMCSA Hours of Service rules (11-hr drive limit, 14-hr duty window, 30-min breaks, 70-hr cycle, 34-hr restarts).
- **Route Integration**: Utilizes OpenRouteService for HGV (Heavy Goods Vehicle) routing and fueling intervals.
