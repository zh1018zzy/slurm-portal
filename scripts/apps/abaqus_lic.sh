#!/bin/bash
#SBATCH --job-name=abaqus_multinode
#SBATCH --nodes=4                    # 使用n个计算节点
#SBATCH --ntasks-per-node=1          # 每个节点1个任务
#SBATCH --cpus-per-task=64           # 每个任务64个CPU核心
#SBATCH --partition=x86_64          # 计算分区
#SBATCH --output=abaqus_%j.out       # 标准输出文件
#SBATCH --error=abaqus_%j.err        # 标准错误文件

#file name
INPUTNAME=sin15-900

cd ${SLURM_SUBMIT_DIR}

#file
INPUTFILE=${INPUTNAME}.inp

#alloc resource
srun  -n ${SLURM_NTASKS} hostname  > ${SLURM_JOBID}.list
#CPUS=`cat  ${SLURM_JOBID}.list | wc -l`


#run the license
/share/home/liyan1995/soft/License/linux_a64/code/bin/lmgrd -c /share/home/liyan1995/soft/License/linux_a64/code/bin/ABAQUSLM__lmgrd__SSQ.lic

#source environment
export PATH=/share/home/liyan1995/soft/SIMULIA/Commands:$PATH
ABAQUS=`which abaqus`

mech_hosts=""
for host in `sort -u ${SLURM_JOBID}.list`; do
n=`grep -c $host ${SLURM_JOBID}.list`
mech_hosts=$(printf "%s['%s',%d]," "$mech_hosts" "$host" "$n")
done
mp_host_list="[${mech_hosts%,*}]"
#echo $mp_host_list > hostlist.txt


# run the solver
mkdir -p scratch
rm -rf abaqus_v6.env
echo "mp_host_list=${mp_host_list}" > abaqus_v6.env
echo  scratch = '"./scratch"' >> abaqus_v6.env 
echo "abaquslm_license_file=\"27800@localhost\"" >> abaqus_v6.env    

unset SLURM_PROCID
$ABAQUS job=${INPUTFILE} cpus=${SLURM_NTASKS} int
