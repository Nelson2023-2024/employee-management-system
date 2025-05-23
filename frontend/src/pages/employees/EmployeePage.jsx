// src/pages/employees/EmployeesPage.jsx
import React, { useState } from "react";
import { Input } from "../../components/ui/input"; // Assuming you have shadcn/ui Input
import { Button } from "../../components/ui/button"; // Assuming you have shadcn/ui Button
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table"; // Assuming you have shadcn/ui Table components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"; // Assuming shadcn/ui DropdownMenu
import { ChevronDown, MoreHorizontal } from "lucide-react"; // Assuming you have lucide-react icons
import { useGetAllEmployees } from "../../hooks/useEmployees";

// Skeleton Component for Loading State
const EmployeesTableSkeleton = () => {
  return (
    <div className="p-6">
      {/* Header Section Skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>

      {/* Search and Filter Section Skeleton */}
      <div className="flex gap-4 mb-6">
        {/* Search Input Skeleton */}
        <div className="relative flex-1">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Department Filter Skeleton */}
        <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>

        {/* Status Filter Skeleton */}
        <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableHead>
              <TableHead>
                <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
              </TableHead>
              <TableHead>
                <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
              </TableHead>
              <TableHead>
                <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableHead>
              <TableHead>
                <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Generate 8 skeleton rows */}
            {Array.from({ length: 8 }).map((_, index) => (
              <TableRow key={index}>
                {/* Name Column Skeleton */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-40 animate-pulse"></div>
                    </div>
                  </div>
                </TableCell>
                
                {/* Department Column Skeleton */}
                <TableCell>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </TableCell>
                
                {/* Position Column Skeleton */}
                <TableCell>
                  <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                </TableCell>
                
                {/* Status Column Skeleton */}
                <TableCell>
                  <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                </TableCell>
                
                {/* Actions Column Skeleton */}
                <TableCell>
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const EmployeesPage = () => {
  const { employees, isLoading, isError, error } = useGetAllEmployees();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  if (isLoading) {
    return <EmployeesTableSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-full text-red-500">
        Error: {error.message}
      </div>
    );
  }

  // Filter employees based on search term, department, and status
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          employee.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = selectedDepartment === "All" || employee.department.name === selectedDepartment;
    const matchesStatus = selectedStatus === "All" || employee.employeeStatus === selectedStatus;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Extract unique departments for the filter dropdown
  const uniqueDepartments = [
    "All",
    ...new Set(employees.map((employee) => employee.department.name)),
  ];

  // Extract unique statuses for the filter dropdown
  const uniqueStatuses = [
    "All",
    ...new Set(employees.map((employee) => employee.employeeStatus)),
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <Button className="flex items-center gap-2">
          <span className="text-xl">+</span> Add Employee
        </Button>
      </div>

      {/* Search and Filter Section */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search employees..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
        </div>

        {/* Department Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              {selectedDepartment} <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {uniqueDepartments.map((dept) => (
              <DropdownMenuItem
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
              >
                {dept}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              {selectedStatus} <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {uniqueStatuses.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => setSelectedStatus(status)}
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Employee Table */}
      <div className="rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((employee) => (
              <TableRow key={employee._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold text-sm">
                      {employee.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{employee.fullName}</div>
                      <div className="text-sm text-gray-500">
                        {employee.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{employee.department.name}</TableCell>
                <TableCell>{employee.position}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      employee.employeeStatus === "Active"
                        ? "bg-green-100 text-green-800"
                        : employee.employeeStatus === "On Leave"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {employee.employeeStatus}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View employee</DropdownMenuItem>
                      <DropdownMenuItem>Edit employee</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Delete employee</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredEmployees.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EmployeesPage;