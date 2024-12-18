import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { number } from 'zod'
type columnValues = string | number

type DiffRecords = Record<string, columnValues>
const CompareExcel: React.FC = () => {
    const [file1Data, setFile1Data] = useState<columnValues[]>([])
    const [file2Data, setFile2Data] = useState<columnValues[]>([])
    const [columns, setColumns] = useState<string[]>([])
    const [excludedColumns, setExcludedColumns] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [differences, setDifferences] = useState<{ rowIndex: number; diffs: DiffRecords }[]>([])
    const input1Ref = useRef<HTMLInputElement>(null)
    const input2Ref = useRef<HTMLInputElement>(null)
    // Collect all unique column names from both files
    useEffect(() => {
        const allColumns = new Set<string>()

        if (file1Data.length > 0) {
            Object.keys(file1Data[0]).forEach((col) => allColumns.add(col))
        }
        if (file2Data.length > 0) {
            Object.keys(file2Data[0]).forEach((col) => allColumns.add(col))
        }

        setColumns(Array.from(allColumns))
    }, [file1Data, file2Data])

    const handleFileUpload = (
        event: React.ChangeEvent<HTMLInputElement>,
        setFileData: React.Dispatch<React.SetStateAction<any[]>>,
    ) => {
        const file = event.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName!]

                // Using header: 1 ensures you get all data (including potential empty headers)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

                // Manually constructing the columns from the first row (if needed)
                if (jsonData.length > 0) {
                    const headers = jsonData[0] as string[] // First row as headers
                    const dataRows = jsonData.slice(1) // Remaining rows as data

                    const formattedData = dataRows.map((row: string[]) =>
                        headers.reduce(
                            (acc, header, index) => {
                                acc[header.trim()] = row[index] // Trim headers and assign values
                                return acc
                            },
                            {} as Record<string, any>,
                        ),
                    )
                    setFileData(formattedData)
                }
            }
            reader.readAsArrayBuffer(file)
        }
    }

    const handleColumnToggle = (column: string) => {
        if (excludedColumns.includes(column)) {
            setExcludedColumns(excludedColumns.filter((col) => col !== column))
        } else {
            setExcludedColumns([...excludedColumns, column])
        }
    }

    const findDifferences = () => {
        setLoading(true)
        const diffs: { rowIndex: number; diffs: DiffRecords }[] = []

        const maxLength = Math.max(file1Data.length, file2Data.length)

        for (let i = 0; i < maxLength; i++) {
            const row1 = file1Data[i] || {}
            const row2 = file2Data[i] || {}
            const rowDiffs: DiffRecords = {}

            columns.forEach((key) => {
                if (!excludedColumns.includes(key)) {
                    if (row1[key] !== row2[key]) {
                        rowDiffs[key] = { file1: row1[key], file2: row2[key] }
                    }
                }
            })

            if (Object.keys(rowDiffs).length > 0) {
                diffs.push({ rowIndex: i, diffs: rowDiffs })
            }
        }

        setDifferences(diffs)
        setLoading(false)
    }

    const renderDifferencesTable = () => {
        if (differences.length === 0) {
            return <p className="mt-6 text-center text-gray-500">No differences found.</p>
        }

        const columnsWithDifferences = new Set<string>()
        differences.forEach((diff) => {
            Object.keys(diff.diffs).forEach((col) => columnsWithDifferences.add(col))
        })

        return (
            <table className="min-w-full border-collapse overflow-auto border border-gray-300 text-sm">
                <thead className="bg-gray-200">
                    <tr>
                        <th className="border border-gray-300 px-2 py-1">Row</th>
                        {Array.from(columnsWithDifferences).map((col) => (
                            <th key={col} className="border border-gray-300 px-2 py-1">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {differences.map((diff) => (
                        <tr key={diff.rowIndex}>
                            <td className="border border-gray-300 bg-gray-200 px-2 py-1 text-center">
                                {diff.rowIndex + 1}
                            </td>
                            {Array.from(columnsWithDifferences).map((col) => (
                                <td key={col} className="border border-gray-300 px-2 py-1">
                                    {diff.diffs[col] ? (
                                        <>
                                            <span className="rounded-lg bg-blue-200 px-2 py-1">
                                                {diff.diffs[col].file1 || '0'}
                                            </span>
                                            /
                                            <span className="rounded-lg bg-orange-200 px-2 py-1">
                                                {diff.diffs[col].file2 || '0'}
                                            </span>
                                        </>
                                    ) : (
                                        // `${diff.diffs[col].file1 || '0'} / ${diff.diffs[col].file2 || '0'}`
                                        <span className="rounded-lg bg-green-200 px-2 py-1">
                                            {' '}
                                            0 / 0{' '}
                                        </span>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        )
    }

    const clearUploads = () => {
        setFile1Data([])
        setFile2Data([])
        input1Ref.current!.value = ''
        input2Ref.current!.value = ''

        setDifferences([])
        setExcludedColumns([])
    }

    return (
        <div className="mx-auto mt-10 w-11/12 max-w-full rounded-lg bg-gray-100 p-6 shadow-md">
            <h1 className="mb-6 text-center text-2xl font-bold">Compare Excel Files</h1>

            <div className="flex justify-between space-x-6">
                <div className="w-1/2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        Upload First Excel File
                    </label>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => handleFileUpload(e, setFile1Data)}
                        ref={input1Ref}
                        className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-hidden"
                    />
                </div>
                <div className="w-1/2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        Upload Second Excel File
                    </label>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => handleFileUpload(e, setFile2Data)}
                        ref={input2Ref}
                        className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-hidden"
                    />
                </div>
            </div>

            {(file1Data.length > 0 || file2Data.length > 0) && (
                <button
                    onClick={clearUploads}
                    className={`mt-6 rounded-lg px-4 py-2 text-white ${
                        loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                    } focus:outline-hidden`}
                >
                    {loading ? 'Comparing...' : 'Clear uploads'}
                </button>
            )}

            {/* Column Selection */}
            {columns.length > 0 && (
                <div className="mt-6">
                    <Collapsible>
                        <CollapsibleTrigger className="mb-2 text-lg font-semibold">
                            Select Columns to Compare
                        </CollapsibleTrigger>
                        <CollapsibleTrigger className="">
                            <Button variant="ghost" size="icon">
                                <ChevronDownIcon className="h-4 w-4" />
                            </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <div className="grid grid-cols-8 gap-4">
                                {columns.map((column) => (
                                    <label key={column} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={!excludedColumns.includes(column)}
                                            onChange={() => handleColumnToggle(column)}
                                            className="form-checkbox h-5 w-5 text-blue-600"
                                        />
                                        <span className="text-gray-700">{column}</span>
                                    </label>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </div>
            )}

            {file1Data.length > 0 && file2Data.length > 0 && (
                <button
                    onClick={findDifferences}
                    disabled={file1Data.length === 0 || file2Data.length === 0}
                    className={`mt-6 rounded-lg px-4 py-2 text-white ${
                        loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                    } focus:outline-hidden`}
                >
                    {loading ? 'Comparing...' : 'Find Differences'}
                </button>
            )}

            {/* Render Differences */}
            {file1Data.length > 0 && file2Data.length > 0 && (
                <div className="mt-6 rounded-lg bg-white p-4 shadow-md">
                    {differences.length > 0 && (
                        <>
                            <div className="mb-4">
                                <h2 className="mb-2 text-xl font-bold">Summary</h2>
                                <p className="text-sm text-gray-500">
                                    Found {differences.length} differences in {file1Data.length}{' '}
                                    rows.
                                </p>
                            </div>
                            <h2 className="mb-4 text-xl font-bold">Differences</h2>{' '}
                        </>
                    )}
                    {renderDifferencesTable()}
                </div>
            )}
        </div>
    )
}

export default CompareExcel
