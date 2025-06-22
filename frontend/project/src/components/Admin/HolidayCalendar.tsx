"use client"

import * as React from 'react';
import { useState } from "react"
import { DatePicker } from "antd"
import dayjs from "dayjs"
import "dayjs/locale/fr"

dayjs.locale("fr")

export interface Holiday {
  id: string
  date: string
  name: string
  fixed: boolean
  custom?: boolean
}

interface HolidayCalendarProps {
  holidays: Holiday[]
  onHolidaysChange: (holidays: Holiday[]) => void
  editable: boolean
  countryCode?: string
}

const HolidayCalendar: React.FC<HolidayCalendarProps> = ({ holidays, onHolidaysChange, editable, countryCode }) => {
  const [newHoliday, setNewHoliday] = useState<Partial<Holiday>>({
    name: "",
    date: dayjs().format("YYYY-MM-DD"),
    fixed: true,
  })

  const handleToggleHoliday = (id: string, checked: boolean) => {
    const updatedHolidays = holidays.map((holiday) => (holiday.id === id ? { ...holiday, fixed: checked } : holiday))
    onHolidaysChange(updatedHolidays)
  }

  const handleRemoveHoliday = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    const updatedHolidays = holidays.filter((holiday) => holiday.id !== id)
    onHolidaysChange(updatedHolidays)
  }

  const handleAddCustomHoliday = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHoliday.name || !newHoliday.date) {
      alert("Veuillez remplir tous les champs")
      return
    }

    // Amélioration de la validation de date
    let dateToValidate: dayjs.Dayjs

    // Si c'est déjà un objet dayjs
    if (dayjs.isDayjs(newHoliday.date)) {
      dateToValidate = newHoliday.date as dayjs.Dayjs
    } else {
      // Essayer plusieurs formats de date
      dateToValidate = dayjs(newHoliday.date)
    }

    if (!dateToValidate.isValid()) {
      alert("Date invalide. Veuillez sélectionner une date valide.")
      return
    }

    const holidayToAdd: Holiday = {
      id: `custom-${Date.now()}`,
      date: dateToValidate.format("YYYY-MM-DD"),
      name: newHoliday.name,
      fixed: true,
      custom: true,
    }

    onHolidaysChange([...holidays, holidayToAdd])
    setNewHoliday({
      name: "",
      date: dayjs().format("YYYY-MM-DD"),
      fixed: true,
    })
  }

  // Correction de la fonction handleDateChange
  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date && date.isValid()) {
      setNewHoliday((prev) => ({
        ...prev,
        date: date.format("YYYY-MM-DD"),
      }))
    } else {
      setNewHoliday((prev) => ({
        ...prev,
        date: "",
      }))
    }
  }

  const isHolidayEditable = (holiday: Holiday) => {
    return holiday.custom || editable
  }

  // Fonction helper pour obtenir la valeur du DatePicker
  const getDatePickerValue = () => {
    if (!newHoliday.date) return null
    const date = dayjs(newHoliday.date)
    return date.isValid() ? date : null
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-gray-800">Jours fériés {countryCode ? `(${countryCode})` : ""}</h4>
        {editable && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{holidays.filter((h) => h.fixed).length} actifs</span>
          </div>
        )}
      </div>

      {editable && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du jour férié</label>
              <input
                type="text"
                value={newHoliday.name || ""}
                onChange={(e) => setNewHoliday((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-brown-500 focus:border-brown-500"
                placeholder="Ex: Fête nationale"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <DatePicker
                className="w-full"
                value={getDatePickerValue()}
                onChange={handleDateChange}
                format="DD/MM/YYYY"
                placeholder="Sélectionner une date"
                allowClear
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddCustomHoliday}
                disabled={!newHoliday.name || !newHoliday.date}
                className="px-4 py-2 bg-brown-600 text-white rounded-md hover:bg-brown-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Ajouter un jour férié
              </button>
            </div>
          </div>
        </div>
      )}

      {holidays.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h5 className="mt-2 text-sm font-medium text-gray-700">Aucun jour férié configuré</h5>
          <p className="mt-1 text-sm text-gray-500">
            {editable ? "Commencez par ajouter un jour férié" : "Aucun jour férié pour ce pays"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                {editable && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holidays
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((holiday) => (
                  <tr key={holiday.id} className={!holiday.fixed ? "opacity-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dayjs(holiday.date).format("dddd D MMMM YYYY")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {holiday.name}
                      {holiday.custom && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Personnalisé
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          holiday.fixed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {holiday.fixed ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    {editable && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {isHolidayEditable(holiday) && (
                            <>
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={holiday.fixed}
                                  onChange={(e) => handleToggleHoliday(holiday.id, e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brown-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brown-600"></div>
                              </label>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveHoliday(holiday.id, e)}
                                className="text-red-600 hover:text-red-900"
                                title="Supprimer"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default HolidayCalendar
