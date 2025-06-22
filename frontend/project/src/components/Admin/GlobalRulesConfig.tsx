"use client"

import * as React from 'react';
import { useState, useEffect, useCallback } from "react"
import type { Country, CountryHolidays, GlobalRules, WorkDay } from "../../types"
import HolidayCalendar from "./HolidayCalendar"
import { Settings, Calendar, Clock, Save, Edit3, X, Check, Loader2 } from "lucide-react"
import dayjs from "dayjs"
import "dayjs/locale/fr"
import { fetchGlobalRulesApi, saveGlobalRulesApi, fetchHolidaysApi } from "../../services/api"

dayjs.locale("fr")

const WORK_DAYS: WorkDay[] = [
  { key: "lundi", label: "Lundi" },
  { key: "mardi", label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi", label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi", label: "Samedi" },
  { key: "dimanche", label: "Dimanche" },
]

interface HolidayCalendarHoliday {
  id: string
  date: string
  name: string
  fixed: boolean
  custom?: boolean
}

const COUNTRIES: Country[] = [
  { code: "MA", name: "Maroc" },
  { code: "DZ", name: "Algérie" },
  { code: "TN", name: "Tunisie" },
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "CH", name: "Suisse" },
  { code: "DE", name: "Allemagne" },
  { code: "ES", name: "Espagne" },
  { code: "IT", name: "Italie" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "US", name: "États-Unis" },
  { code: "CA", name: "Canada" },
]

const DEFAULT_RULES: GlobalRules = {
  jours_ouvrables: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
  jours_feries: [],
  pays_feries: "FR",
  heure_debut_travail: "09:00",
  heure_fin_travail: "17:00",
  pause_midi_debut: "12:00",
  pause_midi_fin: "13:30",
}

const GlobalRulesConfig: React.FC = () => {
  const [rules, setRules] = useState<GlobalRules>(DEFAULT_RULES)
  const [originalRules, setOriginalRules] = useState<GlobalRules>(DEFAULT_RULES)
  const [editMode, setEditMode] = useState(false)
  const [status, setStatus] = useState({ success: "", error: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchingHolidays, setFetchingHolidays] = useState(false)

  const hasChanges = useCallback(() => {
    return JSON.stringify(rules) !== JSON.stringify(originalRules)
  }, [rules, originalRules])

  const loadRules = useCallback(async () => {
    try {
      setStatus({ success: "", error: "" })
      setLoading(true)

      const data = await fetchGlobalRulesApi()
      setRules(data)
      setOriginalRules(data)
    } catch (error) {
      setStatus((prev) => ({ ...prev, error: error instanceof Error ? error.message : String(error) }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const transformHolidays = (holidays: any[]): CountryHolidays[] => {
    return holidays.map((holiday) => ({
      date: holiday.date,
      name: holiday.name,
      fixed: true,
    }))
  }

  const fetchHolidays = useCallback(async (countryCode: string) => {
    try {
      setFetchingHolidays(true)
      setStatus({ success: "", error: "" })

      const holidays = await fetchHolidaysApi(countryCode)

      setRules((prev) => ({
        ...prev,
        jours_feries: transformHolidays(holidays),
        pays_feries: countryCode,
      }))
    } catch (error) {
      setStatus((prev) => ({ ...prev, error: error instanceof Error ? error.message : String(error) }))
    } finally {
      setFetchingHolidays(false)
    }
  }, [])

  const handleCountryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const countryCode = e.target.value
      if (countryCode) {
        fetchHolidays(countryCode)
      } else {
        setRules((prev) => ({
          ...prev,
          jours_feries: [],
          pays_feries: null,
        }))
      }
    },
    [fetchHolidays],
  )

  const handleWorkDayToggle = useCallback((dayKey: string, checked: boolean) => {
    setRules((prev) => ({
      ...prev,
      jours_ouvrables: checked
        ? [...prev.jours_ouvrables, dayKey]
        : prev.jours_ouvrables.filter((day) => day !== dayKey),
    }))
  }, [])

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setRules((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleHolidaysChange = useCallback((holidays: HolidayCalendarHoliday[]) => {
    setRules((prev) => ({
      ...prev,
      jours_feries: holidays.map((h) => ({
        date: h.date,
        name: h.name,
        fixed: h.fixed,
      })),
    }))
  }, [])

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!hasChanges()) {
        setStatus({ success: "", error: "Aucune modification à enregistrer" })
        return
      }

      if (saving) return

      setStatus({ success: "", error: "" })
      setSaving(true)

      try {
        const savedData = await saveGlobalRulesApi(rules)

        setRules(savedData)
        setOriginalRules(savedData)
        setStatus({ success: "Configuration enregistrée avec succès", error: "" })
        setEditMode(false)
      } catch (error) {
        console.error("Erreur lors de la sauvegarde:", error)
        setStatus((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Une erreur est survenue",
        }))
      } finally {
        setSaving(false)
      }
    },
    [rules, saving, hasChanges],
  )

  const handleCancel = useCallback(() => {
    setEditMode(false)
    setStatus({ success: "", error: "" })
    setRules(originalRules)
  }, [originalRules])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
          </div>
          <div className="grid grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-100 my-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuration Globale</h1>
          <p className="text-gray-600 mt-1">Définissez les règles applicables à tous les employés</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full border border-blue-100">
          <Settings className="w-8 h-8 text-blue-600" />
        </div>
      </div>

      {status.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <div className="flex-shrink-0">
            <X className="w-5 h-5 text-red-500 mt-0.5" />
          </div>
          <div className="ml-3">
            <span className="text-red-700 font-medium">{status.error}</span>
          </div>
        </div>
      )}

      {status.success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <div className="flex-shrink-0">
            <Check className="w-5 h-5 text-green-500 mt-0.5" />
          </div>
          <div className="ml-3">
            <span className="text-green-700 font-medium">{status.success}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <section className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Calendar className="w-6 h-6 text-blue-600 mr-3" />
            Jours de travail
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({rules.jours_ouvrables.length} jour{rules.jours_ouvrables.length > 1 ? "s" : ""} sélectionné
              {rules.jours_ouvrables.length > 1 ? "s" : ""})
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {WORK_DAYS.map((day) => (
              <label
                key={day.key}
                className={`group flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                  rules.jours_ouvrables.includes(day.key)
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                    : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                } ${!editMode && "opacity-75 cursor-default hover:scale-100"}`}
              >
                <input
                  type="checkbox"
                  checked={rules.jours_ouvrables.includes(day.key)}
                  onChange={(e) => handleWorkDayToggle(day.key, e.target.checked)}
                  disabled={!editMode}
                  className="hidden"
                />
                <span className="font-medium text-sm">{day.label}</span>
                {rules.jours_ouvrables.includes(day.key) && <Check className="w-4 h-4 mt-2 text-blue-500" />}
              </label>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-br from-gray-50 to-green-50/30 rounded-xl p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Calendar className="w-6 h-6 text-green-600 mr-3" />
            Jours fériés
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({rules.jours_feries.length} jour{rules.jours_feries.length > 1 ? "s" : ""} férié
              {rules.jours_feries.length > 1 ? "s" : ""})
            </span>
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pays</label>
              <select
                value={rules.pays_feries || ""}
                onChange={handleCountryChange}
                disabled={!editMode || fetchingHolidays}
                className={`w-full p-3 border rounded-lg ${
                  editMode
                    ? "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    : "border-gray-200 bg-gray-50"
                } ${fetchingHolidays ? "opacity-50" : ""}`}
              >
                <option value="">Sélectionnez un pays</option>
                <optgroup label="Afrique du Nord">
                  {COUNTRIES.filter((c) => ["MA", "DZ", "TN"].includes(c.code)).map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Europe">
                  {COUNTRIES.filter((c) => ["FR", "BE", "CH", "DE", "ES", "IT", "GB"].includes(c.code)).map(
                    (country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ),
                  )}
                </optgroup>
                <optgroup label="Amérique">
                  {COUNTRIES.filter((c) => ["US", "CA"].includes(c.code)).map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {fetchingHolidays ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                  <p className="text-gray-600">Chargement des jours fériés...</p>
                </div>
              </div>
            ) : (
              <HolidayCalendar
                holidays={rules.jours_feries.map((h, idx) => ({
                  id: idx.toString(),
                  date: h.date,
                  name: h.name,
                  fixed: h.fixed,
                }))}
                onHolidaysChange={handleHolidaysChange}
                editable={editMode}
                countryCode={rules.pays_feries || undefined}
              />
            )}
          </div>
        </section>

        <section className="bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-xl p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Clock className="w-6 h-6 text-purple-600 mr-3" />
            Horaires de travail
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800 flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                Journée de travail
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure de début</label>
                  <input
                    type="time"
                    name="heure_debut_travail"
                    value={rules.heure_debut_travail}
                    onChange={handleTimeChange}
                    disabled={!editMode}
                    className={`w-full p-3 border rounded-lg ${
                      editMode
                        ? "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure de fin</label>
                  <input
                    type="time"
                    name="heure_fin_travail"
                    value={rules.heure_fin_travail}
                    onChange={handleTimeChange}
                    disabled={!editMode}
                    className={`w-full p-3 border rounded-lg ${
                      editMode
                        ? "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800 flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                Pause déjeuner
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Début</label>
                  <input
                    type="time"
                    name="pause_midi_debut"
                    value={rules.pause_midi_debut}
                    onChange={handleTimeChange}
                    disabled={!editMode}
                    className={`w-full p-3 border rounded-lg ${
                      editMode
                        ? "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fin</label>
                  <input
                    type="time"
                    name="pause_midi_fin"
                    value={rules.pause_midi_fin}
                    onChange={handleTimeChange}
                    disabled={!editMode}
                    className={`w-full p-3 border rounded-lg ${
                      editMode
                        ? "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          {!editMode ? (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Edit3 className="w-5 h-5 mr-2" />
              Modifier
            </button>
          ) : (
            <>
              <button
                type="submit"
                disabled={saving || !hasChanges()}
                className={`flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  !hasChanges() ? "from-gray-400 to-gray-500 hover:from-gray-400 hover:to-gray-500" : ""
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Enregistrer {hasChanges() ? "(Modifications détectées)" : "(Aucune modification)"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow disabled:opacity-50"
              >
                <X className="w-5 h-5 mr-2" />
                Annuler
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

export default GlobalRulesConfig
