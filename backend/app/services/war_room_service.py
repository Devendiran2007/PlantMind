import os
import json
import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class WarRoomService:
    @staticmethod
    def run_debate(
        incident_title: str,
        equipment_name: str,
        timeline: list,
        evidence: list,
        live_telemetry: dict,
        history: list = None,
        operator_message: str = None
    ) -> list:
        """
        Orchestrates the multi-agent engineering debate about a given incident.
        """
        if history is None:
            history = []

        # System prompt setting up the agents and the conversation structure
        system_prompt = (
            "You are orchestrating an industrial root cause analysis (RCA) debate between three specialized virtual AI engineering agents:\n"
            "1. Sarah Chen (Designation: Senior Reliability Engineer) - Focuses on mechanical wear, thermal fatigue, and structural logs.\n"
            "2. J. Marcus (Designation: Director of Process Safety) - Focuses on regulatory codes (OSHA PSM, API standards), compliance, hazard identification, and risk impact.\n"
            "3. M. Vance (Designation: Controls System Specialist) - Focuses on SCADA telemetry calibration, sensor feedback mismatches, and valve actuation.\n\n"
            f"The incident under analysis is: '{incident_title}' involving physical asset '{equipment_name}'.\n"
            f"Sequence of Events Timeline:\n{json.dumps(timeline, indent=2)}\n\n"
            f"SCADA Telemetry Evidence:\n{json.dumps(evidence, indent=2)}\n\n"
            f"ACTIVE LIVE TELEMETRY FEED (Current plant status):\n"
            f"- Temperature: {live_telemetry.get('temperature')}°C\n"
            f"- Pressure: {live_telemetry.get('pressure')} bar\n"
            f"- Vibration: {live_telemetry.get('vibration')} mm/s\n"
            f"- Flow Rate: {live_telemetry.get('flow_rate')} m³/h\n\n"
            "Instructions:\n"
            "- Generate a collaborative, technically rigorous dialogue where each agent discusses the telemetry evidence, timeline, and current live telemetry.\n"
            "- The agents MUST reference the current active live readings and comment on whether the system has stabilized or is still in danger (e.g. comparing the peak temperature/pressure during the incident with the current live values).\n"
            "- Sarah Chen should highlight thermal issues or fatigue limits.\n"
            "- J. Marcus should assess safety and regulatory rules.\n"
            "- M. Vance should check DCS valve actuators and sensor signals.\n"
            "- The agents should review the evidence, raise questions, address the operator's intervention (if provided), and work towards a consensus on the actual root cause.\n"
            "- Keep the tone professional, direct, and highly technical.\n"
            "- You must return your response EXACTLY as a valid JSON list of dialogue turns. Do not write any explanations before or after the JSON. Do not include markdown code block formatting (like ```json ... ```). Return raw JSON only.\n\n"
            "JSON Format Example:\n"
            "[\n"
            "  {\n"
            "    \"agent\": \"Sarah Chen\",\n"
            "    \"role\": \"Senior Reliability Engineer\",\n"
            "    \"content\": \"Based on the superheater tube metal temperature rising to 542°C, we are looking at severe thermal stress near the alarm threshold.\"\n"
            "  }\n"
            "]"
        )

        user_content = ""
        if operator_message:
            user_content += f"OPERATOR INTERVENTION: '{operator_message}'\n\n"
        
        if history:
            user_content += "Previous Debate History:\n"
            for msg in history:
                user_content += f"{msg.get('agent')} ({msg.get('role')}): {msg.get('content')}\n"
            user_content += "\nContinue the debate with 3-4 new turns of dialogue incorporating the operator's comments."
        else:
            user_content += "Start the debate with 3-4 initial turns of dialogue outlining each agent's preliminary analysis of the evidence."

        answer = ""

        # 1. Try NVIDIA NIM (Kimi or alternate model)
        if settings.NVIDIA_API_KEY and os.getenv("TESTING") != "True":
            try:
                url = settings.NVIDIA_API_URL
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
                    "Accept": "application/json",
                }
                payload = {
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    "model": settings.NVIDIA_MODEL,
                    "temperature": 0.2,
                }
                with httpx.Client(timeout=20.0) as client:
                    resp = client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    answer = resp.json()["choices"][0]["message"]["content"].strip()
                    logger.info("Successfully fetched war-room debate from NVIDIA NIM.")
            except Exception as e:
                logger.error(f"NVIDIA NIM war-room completion failed: {e}")

        # 2. Try Gemini fallback
        if not answer and settings.GEMINI_API_KEY and os.getenv("TESTING") != "True":
            try:
                url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{
                        "parts": [{"text": f"{system_prompt}\n\nUser Request:\n{user_content}"}]
                    }],
                    "generationConfig": {"temperature": 0.2}
                }
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    candidates = resp.json().get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            answer = parts[0].get("text", "").strip()
                            logger.info("Successfully fetched war-room debate from Gemini.")
            except Exception as e:
                logger.error(f"Gemini war-room completion failed: {e}")

        # Parse LLM response
        if answer:
            try:
                # Strip markdown wrappers if present
                clean_answer = answer.strip()
                if clean_answer.startswith("```"):
                    # Find first [ or {
                    start_idx = min(clean_answer.find("["), clean_answer.find("{"))
                    end_idx = max(clean_answer.rfind("]"), clean_answer.rfind("}"))
                    if start_idx != -1 and end_idx != -1:
                        clean_answer = clean_answer[start_idx:end_idx + 1]
                
                parsed_list = json.loads(clean_answer)
                if isinstance(parsed_list, list):
                    return parsed_list
            except Exception as parse_ex:
                logger.error(f"Failed to parse war-room debate JSON: {parse_ex}. Raw Answer: {answer}")

        # 3. High-Quality Fallback Simulation (Static/Deterministic but detailed)
        logger.warning("No functional LLM response obtained. Running local fallback simulator.")
        return WarRoomService._generate_fallback_debate(incident_title, equipment_name, live_telemetry, operator_message)

    @staticmethod
    def _generate_fallback_debate(incident_title: str, equipment_name: str, live_telemetry: dict, operator_message: str = None) -> list:
        """
        Generates structured fallback debate messages if LLM is unavailable or fails to return JSON.
        """
        cur_temp = live_telemetry.get('temperature', 0)
        cur_press = live_telemetry.get('pressure', 0)
        cur_vib = live_telemetry.get('vibration', 0)

        if operator_message:
            # Dynamic response acknowledging the operator input
            return [
                {
                    "agent": "M. Vance",
                    "role": "Controls System Specialist",
                    "content": f"Acknowledging the operator input: '{operator_message}'. Looking at the current sensor readings for {equipment_name}, we are running at {cur_temp}°C temperature and {cur_press} bar loop pressure. This is a massive delta from the peak 542°C incident anomaly, which confirms our cooling bypass loop is helping, but we need to address the mechanical valve lag."
                },
                {
                    "agent": "Sarah Chen",
                    "role": "Senior Reliability Engineer",
                    "content": f"Agreed. With the live temperature currently sitting at {cur_temp}°C and vibration at {cur_vib} mm/s, the metal stress is stabilizing. However, if the electro-pneumatic positioner on valve FC-301 remains stuck, another load spike will immediately trigger a thermal over-excursion."
                },
                {
                    "agent": "J. Marcus",
                    "role": "Director of Process Safety",
                    "content": f"Under API 521 rules, loop pressure peaking at {cur_press} bar is still within structural limits but leaves zero margin for error. M. Vance, we must command a remote calibration cycle now to check if the actuator responds, or dispatch a tech immediately."
                }
            ]

        # Initial debate fallback
        return [
            {
                "agent": "Sarah Chen",
                "role": "Senior Reliability Engineer",
                "content": f"Reviewing the incident history for '{incident_title}'. The primary concern was the superheater tube metal temperature peaking at 542°C. Looking at the active sensor feed for {equipment_name}, the temperature is currently sitting at {cur_temp}°C. This shows the boiler has cooled down, but we are not out of the woods yet."
            },
            {
                "agent": "M. Vance",
                "role": "Controls System Specialist",
                "content": f"Correct, Sarah. The live pressure sensor is reporting {cur_press} bar, while loop vibration is at {cur_vib} mm/s. The telemetry during the shutdown event showed a clear feedback discrepancy on valve FC-301 (12% feedback vs 42% commanded). The current live readings show pressure is stabilized, but we must run a diagnostics scan on the positioner."
            },
            {
                "agent": "J. Marcus",
                "role": "Director of Process Safety",
                "content": f"Even with loop pressure stable at {cur_press} bar and vibration at {cur_vib} mm/s, operating without a fully calibrated safety valve violates OSHA 1910.119 PSM standards. If the loop bypass isn't physically checked, we cannot sign off on the safety compliance clearance."
            },
            {
                "agent": "Sarah Chen",
                "role": "Senior Reliability Engineer",
                "content": "I agree. Let's ask the operator to initiate a remote calibration check on the positioner or schedule an immediate physical inspection."
            }
        ]
