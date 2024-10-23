import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

const CompareExcel: React.FC = () => {
  const [file1Data, setFile1Data] = useState<any[]>([]);
  const [file2Data, setFile2Data] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [excludedColumns, setExcludedColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [differences, setDifferences] = useState<{ rowIndex: number; diffs: { [key: string]: { file1: any; file2: any } } }[]>([]);

  // Collect all unique column names from both files
  useEffect(() => {
    const allColumns = new Set<string>();

    if (file1Data.length > 0) {
      Object.keys(file1Data[0]).forEach((col) => allColumns.add(col));
    }
    if (file2Data.length > 0) {
      Object.keys(file2Data[0]).forEach((col) => allColumns.add(col));
    }

    setColumns(Array.from(allColumns));
  }, [file1Data, file2Data]);

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFileData: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setFileData(jsonData);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleColumnToggle = (column: string) => {
    if (excludedColumns.includes(column)) {
      setExcludedColumns(excludedColumns.filter((col) => col !== column));
    } else {
      setExcludedColumns([...excludedColumns, column]);
    }
  };

  const findDifferences = () => {
    setLoading(true);
    const diffs: { rowIndex: number; diffs: { [key: string]: { file1: any; file2: any } } }[] = [];

    const maxLength = Math.max(file1Data.length, file2Data.length);

    for (let i = 0; i < maxLength; i++) {
      const row1 = file1Data[i] || {};
      const row2 = file2Data[i] || {};
      const rowDiffs: { [key: string]: { file1: any; file2: any } } = {};

      columns.forEach((key) => {
        if (!excludedColumns.includes(key)) {
          if (row1[key] !== row2[key]) {
            rowDiffs[key] = { file1: row1[key], file2: row2[key] };
          }
        }
      });

      if (Object.keys(rowDiffs).length > 0) {
        diffs.push({ rowIndex: i, diffs: rowDiffs });
      }
    }

    setDifferences(diffs);
    setLoading(false);
  };

  const renderDifferencesTable = () => {
    if (differences.length === 0) {
      return <p className="mt-6 text-center text-gray-500">No differences found.</p>;
    }

    const columnsWithDifferences = new Set<string>();
    differences.forEach((diff) => {
      Object.keys(diff.diffs).forEach((col) => columnsWithDifferences.add(col));
    });

    return (
      <table className="min-w-full border-collapse border border-gray-300 text-sm">
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
              <td className="border border-gray-300 px-2 py-1 text-center">{diff.rowIndex + 1}</td>
              {Array.from(columnsWithDifferences).map((col) => (
                <td key={col} className="border border-gray-300 px-2 py-1 bg-red-200">
                  {diff.diffs[col]
                    ? `${diff.diffs[col].file1 || '0'} / ${diff.diffs[col].file2 || '0'}`
                    : '0 / 0' }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="max-w-full mx-auto p-6 bg-gray-100 rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold text-center mb-6">Compare Excel Files</h1>

      <div className="flex justify-between space-x-6">
        <div className="w-1/2">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Upload First Excel File
          </label>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => handleFileUpload(e, setFile1Data)}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
        </div>
        <div className="w-1/2">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Upload Second Excel File
          </label>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => handleFileUpload(e, setFile2Data)}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
        </div>
      </div>

      {/* Column Selection */}
      {columns.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Select Columns to Compare</h2>
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
        </div>
      )}

      <button
        onClick={findDifferences}
        disabled={file1Data.length === 0 || file2Data.length === 0}
        className={`mt-6 px-4 py-2 rounded-lg text-white ${
          loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
        } focus:outline-none`}
      >
        {loading ? "Comparing..." : "Find Differences"}
      </button>

      {/* Render Differences */}
      {differences.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Differences</h2>
          {renderDifferencesTable()}
        </div>
      )}
    </div>
  );
};

export default CompareExcel;