import { useState, useEffect, Fragment } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

// import ProductCard from "../../components/product-card/product-card.component";

// import { selectCategoriesMap } from "../../store/categories/category.selector";

const EmployeesList = () => {
	const { category } = useParams();
	// const categoriesMap = useSelector(selectCategoriesMap);
	// const [products, setProducts] = useState(categoriesMap[category]);

	// useEffect(() => {
	// 	setProducts(categoriesMap[category]);
	// }, [category, categoriesMap]);

	return (
		<Fragment>
			<Card>
				<CardHeader>
					<CardTitle className='text-2xl'>All Employees</CardTitle>
					{/* <CardDescription>Card Description</CardDescription> */}
				</CardHeader>
				<CardContent>
					<p>Card Content</p>
				</CardContent>
				<CardFooter>
					<p>Card Footer</p>
				</CardFooter>
			</Card>
		</Fragment>
	);
};

export default EmployeesList;
