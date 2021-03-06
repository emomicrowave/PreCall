import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'
import './styling/ConfusionFilter.css'
import {ConfusionUtil} from "./ConfusionUtil";

export default class ConfusionFilter extends Component {
	
	state = {}

	round = (a) => {
		return Number(Math.round(a+'e'+2)+'e-'+2)
	}
	
	calculateConfusion = () => {
		
		const data = this.props.data
		
		//arrays that will be saved to the state (once!)
		let allTPs = []
		let allFPs = []
		let allTNs = []
		let allFNs = []
		
		//thresholds[i] will represent the threshold to obtain allTPs[i], allFPs[i] etc.
		let thresholds = []
		
		for (let i=0; i < data.length; i++){

			//save threshold
			thresholds.push(data[i].threshold)

			//necessary constants
			const filters = this.round(100*data[i]['filter_rate'])
			const matches = this.round(100*data[i]['match_rate'])
					
			//calculate confusion values					
			const tp = this.round(matches*data[i]['precision'])
			const fp = this.round(matches-tp)
			const tn = this.round(filters*data[i]['!precision'])
			const fn = this.round(filters-tn)
			
			//fill arrays
			allTPs.push(tp)
			allFPs.push(fp)
			allTNs.push(tn)
			allFNs.push(fn)
		}
		
		this.setState({
			thresholds: thresholds,
			'allTPs': allTPs,
			'allFPs': allFPs,
			'allTNs': allTNs,
			'allFNs': allFNs,
		})
	}
	
	setConfusion = (confusionValue, wantedValue) => {
		
		//confusionValue = 'TP', 'FP', 'TN', 'FN'
		//wantedValue = 'max', 'min', int
		const thresholds = this.state.thresholds
		
		//get the full array of TPs, FPs, TNs or FNs from state, depending on what Button has been clicked
		const fullArray = eval('this.state.' + 'all' + confusionValue +'s')
		
		let wantedIndex
		
		if (wantedValue === 'max'){
			
			//get the maximum's index
			wantedIndex = fullArray.indexOf(this.arrayMax(fullArray))
						
		} else if (wantedValue === 'min'){
			
			//get the minimum's index
			wantedIndex = fullArray.indexOf(this.arrayMin(fullArray))
						
		} else if (this.isNumber(wantedValue)) {
			
			//user passed value in %
			let closest = Infinity
			wantedIndex = 0
			
			//find index of closest existing value to the one specified by user
			for (let i = 0; i < fullArray.length; i++){
				
				if (Math.abs(wantedValue - fullArray[i]) < Math.abs(wantedValue - closest) ){
					
					closest = fullArray[i]
					wantedIndex = i
					
				}
			}
			
		} else {
			
			return 
			
		}
		
		return thresholds[wantedIndex]
		
	}
	
	pmConfusion = (confusionValue, plusMinus) => {
		
		//confusionValue = 'TP', 'FP', 'TN', 'FN'
		//plusMinus = '+', '-'
		
		//calculate current % of confusion value...
		const currentThreshold = this.props.currentThreshold
		const wantedIndex = this.state.thresholds.indexOf(currentThreshold)
		const fullArray = eval('this.state.' + 'all' + confusionValue +'s')
		let currentConfusion = fullArray[wantedIndex]
		const min = this.arrayMin(fullArray)
		const max = this.arrayMax(fullArray)
		
		let newThreshold = currentThreshold
		
		//two extra conditions needed, not to get stuck in an infinite loop when max or min has been reached
		while(newThreshold === currentThreshold && currentConfusion >= min && currentConfusion <= max)
		{
			// TPs and FNs have a smaller domain and we want more precision when incrementing or decrementing
			const increment = confusionValue === "TP" || confusionValue === "FN" ? 0.02 : 0.3;

			//...and either add 0.1 to it
			if(plusMinus === '+'){
				
				currentConfusion = currentConfusion + increment;
				newThreshold = this.setConfusion(confusionValue,currentConfusion)
				
			} 
			
			//...or subtract 0.1 from it
			else if (plusMinus === '-'){
				
				currentConfusion = currentConfusion - increment;
				newThreshold = this.setConfusion(confusionValue,currentConfusion)	
				
			}
		}
		
		//stop the hold effect on - / + buttons
		if(currentConfusion >= max || currentConfusion <= min){
			clearInterval(this.buttonPressTimer)
		}
		
		//new threshold is determined, pass it
		this.props.callback('threshold', newThreshold, "confusionfilter")

	}
	
	arrayMin = (arr) => {
		let len = arr.length, min = Infinity
			while (len--) {
				if (arr[len] < min) {
					min = arr[len]
				}
			}
		return min
	}
	
	arrayMax = (arr) => {
		let len = arr.length, max = -Infinity
			while (len--) {
				if (arr[len] > max) {
					max = arr[len]
				}
			}
		return max
	}
	
	isNumber = (n) => {
		return !isNaN(parseFloat(n)) && !isNaN(n - 0) 
	}

	handleChange = (e, { name, value }) => this.setState({ [name]: value })

	startTimer = (pm) => {
	
		//button hold effect: call pmConfusion every 75ms
		this.buttonPressTimer = setInterval(() => this.pmConfusion(this.props.confusionValue,pm), 75)
		
	}
	
	render () {
				
		if (!this.state.allTNs && !this.state.allFPs && !this.state.allTPs && !this.state.allFNs){
			this.calculateConfusion()	
		}		
		
		const fullArray = eval('this.state.' + 'all' + this.props.confusionValue +'s')
		let currentConfusion, min, max
		
		//check if max or min has been reached to grey out corresponding button
		if(fullArray){
			
			min = this.arrayMin(fullArray)
			max = this.arrayMax(fullArray)

			// currentThreshold might be a value which is not included in the all thresholds array,
			// so we need to set it manually
			const currentThreshold = this.props.currentThreshold
			const wantedIndex = ConfusionUtil.bin_search(currentThreshold, this.state.thresholds);
			currentConfusion = fullArray[wantedIndex]

		}

		return (

			<div className='pmButtons'>
				{/*<Button color='blue' onClick={() => this.setConfusion('TN','max')}>Maximize TNs</Button>*/}
				{ this.props.buttonType === '-' ?
					(currentConfusion > min ?
						<Button
							className='pmButton pmButton1'
							onMouseDown={() => {
								this.startTimer('-')
								this.pmConfusion(this.props.confusionValue,'-')
							}}
							onMouseUp={() => clearInterval(this.buttonPressTimer)}
							onMouseLeave={() => clearInterval(this.buttonPressTimer)}>
							<p>-</p>
						</Button>
						: 
						<Button
							className='pmButton pmButton1 greyButton'
							onMouseUp={() => clearInterval(this.buttonPressTimer)}
							onMouseLeave={() => clearInterval(this.buttonPressTimer)}>
							<p>-</p>
						</Button>
					)
					:
					(currentConfusion < max ?
						<Button
							className='pmButton pmButton2'
							onMouseDown={() => {
								this.startTimer('+')
								this.pmConfusion(this.props.confusionValue,'+')
							}}
							onMouseUp={() => clearInterval(this.buttonPressTimer)}
							onMouseLeave={() => clearInterval(this.buttonPressTimer)}>							
							<p>+</p>
						</Button>
						: 
						<Button
							className='pmButton pmButton2 greyButton'
							onMouseUp={() => clearInterval(this.buttonPressTimer)}
							onMouseLeave={() => clearInterval(this.buttonPressTimer)}>							
							<p>+</p>
						</Button>
					)
				}
			</div>
			
		)
	}
}